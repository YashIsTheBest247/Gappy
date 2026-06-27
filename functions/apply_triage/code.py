#input_type_name: ApplyTriageInput
#output_type_name: ApplyTriageResult
#function_name: apply_triage

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod

SLA_HOURS = {"urgent": 2, "high": 8, "normal": 24, "low": 72}


class ApplyTriageInput(BaseModel):
    ticket_id: str
    category: str
    priority: str
    sentiment: str
    summary: str
    tags: List[str] = []
    related_ticket_id: Optional[str] = None
    reasoning: Optional[str] = None


class ApplyTriageResult(BaseModel):
    ok: bool
    escalate: bool


async def apply_triage(ctx: FunctionContext, data: ApplyTriageInput) -> ApplyTriageResult:
    pod = Pod.from_env()

    hours = SLA_HOURS.get(data.priority, 24)
    sla_due = (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()

    escalate = data.priority == "urgent" or (data.priority == "high" and data.sentiment == "negative")

    update = {
        "category": data.category,
        "priority": data.priority,
        "sentiment": data.sentiment,
        "summary": data.summary,
        "tags": data.tags,
        "status": "escalated" if escalate else "triaged",
        "sla_due_at": sla_due,
    }
    if data.related_ticket_id:
        update["related_ticket_id"] = data.related_ticket_id

    pod.table("tickets").update(data.ticket_id, update)

    pod.table("ticket_events").create({
        "ticket_id": data.ticket_id,
        "kind": "triaged",
        "actor": "triage-agent",
        "detail": f"{data.priority} / {data.category} / {data.sentiment} — {data.summary}"
                  + (f" | {data.reasoning}" if data.reasoning else ""),
    })

    if escalate:
        pod.table("ticket_events").create({
            "ticket_id": data.ticket_id,
            "kind": "escalated",
            "actor": "intake",
            "detail": "Auto-escalated: urgent priority or high + negative sentiment.",
        })

    return ApplyTriageResult(ok=True, escalate=escalate)
