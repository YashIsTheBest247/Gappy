#input_type_name: ChurnInput
#output_type_name: ChurnResult
#function_name: churn_sweep

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ChurnInput(BaseModel):
    dry_run: bool = False   # if true, count at-risk customers but don't open tickets


class ChurnResult(BaseModel):
    at_risk: int
    opened: int


def _first(name: str) -> str:
    return (name or "there").split(" ")[0]


async def churn_sweep(ctx: FunctionContext, data: ChurnInput) -> ChurnResult:
    pod = Pod.from_env()

    tickets = pod.records.list("tickets", limit=500).to_dict()["items"]
    by_id = {t["id"]: t for t in tickets}
    csat = pod.records.list("csat", limit=500).to_dict()["items"]

    # at-risk signals, keyed by lowercased customer email
    risk: dict[str, dict] = {}

    def flag(email, ticket, reason):
        if not email:
            return
        key = email.lower()
        if key not in risk:
            risk[key] = {"ticket": ticket, "reasons": []}
        risk[key]["reasons"].append(reason)

    # 1) detractors: CSAT rating <= 2
    for c in csat:
        if (c.get("rating") or 5) <= 2:
            t = by_id.get(c.get("ticket_id"))
            if t:
                note = (c.get("comment") or "").strip()
                flag(t.get("customer_email"), t, f"rated us {c.get('rating')}/5" + (f' — "{note}"' if note else ""))

    # 2) negative sentiment on hot tickets (escalated, or urgent/high priority)
    for t in tickets:
        if t.get("sentiment") == "negative" and (t.get("status") == "escalated" or t.get("priority") in ("urgent", "high")):
            flag(t.get("customer_email"), t, f"a {t.get('priority')} ticket left them frustrated (#{t.get('number')})")

    at_risk = len(risk)
    if data.dry_run:
        return ChurnResult(at_risk=at_risk, opened=0)

    opened = 0
    for email, info in risk.items():
        # skip if we already have an open proactive ticket for this customer
        already = any(
            (t.get("customer_email") or "").lower() == email
            and "proactive" in (t.get("tags") or [])
            and t.get("status") not in ("answered", "closed")
            for t in tickets
        )
        if already:
            continue

        src = info["ticket"]
        name = src.get("customer_name") or email.split("@")[0]
        reasons = "; ".join(info["reasons"][:2])
        body = (
            f"Hi {_first(name)}, this is the team behind your account reaching out directly. "
            "We noticed your recent experience with us didn't go the way it should have, and we wanted to get "
            "ahead of it rather than wait. We'd genuinely like to make it right — whether that's a quick call, "
            "a closer look at what went wrong, or just answering anything that's still open. "
            "Reply here and a real person will personally see it through. We value having you with us."
        )
        new_t = pod.table("tickets").create({
            "subject": f"Proactive retention — checking in with {name}",
            "channel": "email",
            "customer_name": name,
            "customer_email": email,
            "status": "awaiting_approval",
            "priority": "high",
            "category": "account",
            "sentiment": "negative",
            "summary": f"AI flagged churn risk: {reasons}.",
            "tags": ["churn-risk", "proactive"],
            "related_ticket_id": src.get("id"),
            "body_preview": "AI-initiated retention outreach (no inbound message).",
        })
        tid = new_t["id"] if isinstance(new_t, dict) else new_t.to_dict()["id"]
        pod.table("drafts").create({"ticket_id": tid, "version": 1, "body": body, "status": "proposed"})
        pod.table("ticket_events").create({
            "ticket_id": tid, "kind": "drafted", "actor": "churn-save",
            "detail": f"Proactive retention outreach drafted — {reasons}.",
        })
        opened += 1

    return ChurnResult(at_risk=at_risk, opened=opened)
