#input_type_name: FollowupInput
#output_type_name: FollowupResult
#function_name: followup_sweep

from datetime import datetime, timedelta, timezone

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class FollowupInput(BaseModel):
    hours: int = 48   # answered at least this long ago


class FollowupResult(BaseModel):
    followed_up: int


async def followup_sweep(ctx: FunctionContext, data: FollowupInput) -> FollowupResult:
    pod = Pod.from_env()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=max(0, data.hours))).isoformat()

    answered = pod.records.list(
        "tickets", limit=500,
        filter=[{"field": "status", "op": "eq", "value": "answered"}],
    ).to_dict()["items"]

    n = 0
    for t in answered:
        if not t.get("resolved_at") or str(t["resolved_at"]) > cutoff:
            continue  # answered too recently

        msgs = pod.records.list(
            "messages", limit=200,
            filter=[{"field": "ticket_id", "op": "eq", "value": t["id"]}],
        ).to_dict()["items"]
        outbound = [m for m in msgs if m.get("direction") == "outbound"]
        if not outbound:
            continue
        last_out = max(str(m.get("created_at") or "") for m in outbound)
        replied = any(m.get("direction") == "inbound" and str(m.get("created_at") or "") > last_out for m in msgs)
        if replied:
            continue  # customer already came back

        existing = pod.records.list(
            "drafts", limit=200,
            filter=[{"field": "ticket_id", "op": "eq", "value": t["id"]}],
        ).to_dict()["items"]
        name = (t.get("customer_name") or "there").split(" ")[0]
        body = (
            f"Hi {name}, just checking in to make sure everything got sorted on your end. "
            "If there's anything still open or you have follow-up questions, reply here and we'll jump right back on it. "
            "Otherwise, glad we could help!"
        )
        pod.table("drafts").create({
            "ticket_id": t["id"], "version": len(existing) + 1, "body": body, "status": "proposed",
        })
        pod.table("tickets").update(t["id"], {"status": "awaiting_approval"})
        pod.table("ticket_events").create({
            "ticket_id": t["id"], "kind": "drafted", "actor": "followup",
            "detail": "Follow-up drafted — no customer reply since we answered.",
        })
        n += 1

    return FollowupResult(followed_up=n)
