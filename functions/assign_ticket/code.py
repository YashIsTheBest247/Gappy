#input_type_name: AssignInput
#output_type_name: AssignResult
#function_name: assign_ticket

from typing import Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class AssignInput(BaseModel):
    ticket_id: str
    user_id: Optional[str] = None   # None = unassign
    assignee_name: Optional[str] = None


class AssignResult(BaseModel):
    ok: bool


async def assign_ticket(ctx: FunctionContext, data: AssignInput) -> AssignResult:
    pod = Pod.from_env()
    pod.table("tickets").update(data.ticket_id, {"assignee_user_id": data.user_id})

    who = data.assignee_name or (data.user_id and "a teammate") or "no one"
    detail = f"Assigned to {who}." if data.user_id else "Unassigned."
    pod.table("ticket_events").create({
        "ticket_id": data.ticket_id,
        "kind": "note",
        "actor": ctx.user_email or "console",
        "detail": detail,
    })
    return AssignResult(ok=True)
