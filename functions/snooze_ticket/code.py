#input_type_name: SnoozeInput
#output_type_name: SnoozeResult
#function_name: snooze_ticket

from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class SnoozeInput(BaseModel):
    ticket_id: str
    hours: int = 24
    reason: Optional[str] = None


class SnoozeResult(BaseModel):
    until: str


async def snooze_ticket(ctx: FunctionContext, data: SnoozeInput) -> SnoozeResult:
    pod = Pod.from_env()
    until = (datetime.now(timezone.utc) + timedelta(hours=max(1, data.hours))).isoformat()

    # Replace any existing snooze for this ticket.
    existing = pod.records.list(
        "snoozes", limit=50, filter=[{"field": "ticket_id", "op": "eq", "value": data.ticket_id}]
    ).to_dict()["items"]
    for s in existing:
        pod.table("snoozes").delete(s["id"])

    pod.table("snoozes").create({"ticket_id": data.ticket_id, "until": until, "reason": data.reason})
    pod.table("ticket_events").create({
        "ticket_id": data.ticket_id, "kind": "note", "actor": ctx.user_email or "console",
        "detail": f"Snoozed for {data.hours}h (until {until}).",
    })
    return SnoozeResult(until=until)
