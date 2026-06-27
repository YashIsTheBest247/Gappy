#input_type_name: SlaSweepInput
#output_type_name: SlaSweepResult
#function_name: sla_sweep

from datetime import datetime, timezone

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod

OPEN = {"new", "triaged", "awaiting_approval"}


class SlaSweepInput(BaseModel):
    pass


class SlaSweepResult(BaseModel):
    escalated: int


async def sla_sweep(ctx: FunctionContext, data: SlaSweepInput) -> SlaSweepResult:
    pod = Pod.from_env()
    now = datetime.now(timezone.utc).isoformat()

    rows = pod.records.list("tickets", limit=500).to_dict()["items"]
    overdue = [
        t for t in rows
        if t.get("status") in OPEN and t.get("sla_due_at") and str(t["sla_due_at"]) < now
    ]

    for t in overdue:
        pod.table("tickets").update(t["id"], {"status": "escalated"})
        pod.table("ticket_events").create({
            "ticket_id": t["id"],
            "kind": "escalated",
            "actor": "sla-sweep",
            "detail": f"Auto-escalated: SLA breached (was due {t.get('sla_due_at')}).",
        })

    return SlaSweepResult(escalated=len(overdue))
