#input_type_name: EscalateInput
#output_type_name: EscalateResult
#function_name: escalate_ticket

from typing import Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class EscalateInput(BaseModel):
    ticket_id: str
    reason: Optional[str] = None


class EscalateResult(BaseModel):
    ok: bool


async def escalate_ticket(ctx: FunctionContext, data: EscalateInput) -> EscalateResult:
    pod = Pod.from_env()

    pod.table("tickets").update(data.ticket_id, {"status": "escalated"})

    pod.table("ticket_events").create({
        "ticket_id": data.ticket_id,
        "kind": "escalated",
        "actor": ctx.user_email or "escalate_ticket",
        "detail": data.reason or "Flagged for human attention.",
    })
    return EscalateResult(ok=True)
