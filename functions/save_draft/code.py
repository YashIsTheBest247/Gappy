#input_type_name: SaveDraftInput
#output_type_name: SaveDraftResult
#function_name: save_draft

from typing import Any, List, Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class SaveDraftInput(BaseModel):
    ticket_id: str
    body: str
    citations: List[Any] = []
    confidence: Optional[float] = None
    needs_human: bool = False


class SaveDraftResult(BaseModel):
    draft_id: str
    version: int


async def save_draft(ctx: FunctionContext, data: SaveDraftInput) -> SaveDraftResult:
    pod = Pod.from_env()

    existing = pod.records.list(
        "drafts",
        limit=200,
        filter=[{"field": "ticket_id", "op": "eq", "value": data.ticket_id}],
    ).to_dict()["items"]
    version = len(existing) + 1

    draft = pod.table("drafts").create({
        "ticket_id": data.ticket_id,
        "version": version,
        "body": data.body,
        "citations": data.citations,
        "confidence": data.confidence,
        "status": "proposed",
    })

    # Keep an escalated ticket flagged for a human; otherwise move it to the review queue.
    current = pod.table("tickets").get(data.ticket_id).get("status")
    ticket_update = {}
    if current != "escalated":
        ticket_update["status"] = "awaiting_approval"
    if data.confidence is not None:
        ticket_update["confidence"] = data.confidence
    if ticket_update:
        pod.table("tickets").update(data.ticket_id, ticket_update)

    detail = f"Draft v{version} ready"
    if data.confidence is not None:
        detail += f" (confidence {round(float(data.confidence), 2)})"
    if data.needs_human:
        detail += " — flagged: needs human, KB did not fully cover this."

    pod.table("ticket_events").create({
        "ticket_id": data.ticket_id,
        "kind": "drafted",
        "actor": "draft-agent",
        "detail": detail,
    })

    return SaveDraftResult(draft_id=str(draft["id"]), version=version)
