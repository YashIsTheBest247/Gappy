#input_type_name: CsatInput
#output_type_name: CsatResult
#function_name: record_csat

from typing import Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class CsatInput(BaseModel):
    ticket_id: str
    rating: int
    comment: Optional[str] = None


class CsatResult(BaseModel):
    ok: bool


async def record_csat(ctx: FunctionContext, data: CsatInput) -> CsatResult:
    pod = Pod.from_env()
    pod.table("csat").create({
        "ticket_id": data.ticket_id,
        "rating": data.rating,
        "comment": data.comment,
    })
    pod.table("ticket_events").create({
        "ticket_id": data.ticket_id,
        "kind": "note",
        "actor": "customer",
        "detail": f"CSAT: {data.rating}/5" + (f" — {data.comment}" if data.comment else ""),
    })
    return CsatResult(ok=True)
