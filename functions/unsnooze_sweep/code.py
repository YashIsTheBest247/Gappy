#input_type_name: UnsnoozeInput
#output_type_name: UnsnoozeResult
#function_name: unsnooze_sweep

from datetime import datetime, timezone

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class UnsnoozeInput(BaseModel):
    pass


class UnsnoozeResult(BaseModel):
    resurfaced: int


async def unsnooze_sweep(ctx: FunctionContext, data: UnsnoozeInput) -> UnsnoozeResult:
    pod = Pod.from_env()
    now = datetime.now(timezone.utc).isoformat()

    rows = pod.records.list("snoozes", limit=500).to_dict()["items"]
    expired = [s for s in rows if s.get("until") and str(s["until"]) <= now]

    for s in expired:
        pod.table("snoozes").delete(s["id"])
        pod.table("ticket_events").create({
            "ticket_id": s["ticket_id"], "kind": "note", "actor": "snooze-sweep",
            "detail": "Snooze expired — back in the queue.",
        })

    return UnsnoozeResult(resurfaced=len(expired))
