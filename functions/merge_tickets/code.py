#input_type_name: MergeInput
#output_type_name: MergeResult
#function_name: merge_tickets

from datetime import datetime, timezone

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class MergeInput(BaseModel):
    primary_id: str
    duplicate_id: str


class MergeResult(BaseModel):
    ok: bool
    moved_messages: int
    detail: str


async def merge_tickets(ctx: FunctionContext, data: MergeInput) -> MergeResult:
    if data.primary_id == data.duplicate_id:
        return MergeResult(ok=False, moved_messages=0, detail="Cannot merge a ticket into itself.")

    pod = Pod.from_env()

    def fetch(tid):
        rows = pod.records.list(
            "tickets", limit=1, filter=[{"field": "id", "op": "eq", "value": tid}]
        ).to_dict()["items"]
        return rows[0] if rows else {}

    primary = fetch(data.primary_id)
    dup = fetch(data.duplicate_id)
    if not primary or not dup:
        return MergeResult(ok=False, moved_messages=0, detail="One of the tickets no longer exists.")

    # move the duplicate's messages onto the primary thread
    msgs = pod.records.list(
        "messages", limit=500,
        filter=[{"field": "ticket_id", "op": "eq", "value": data.duplicate_id}],
    ).to_dict()["items"]
    moved = 0
    for m in msgs:
        pod.table("messages").update(m["id"], {"ticket_id": data.primary_id})
        moved += 1

    now = datetime.now(timezone.utc).isoformat()
    pod.table("tickets").update(data.duplicate_id, {
        "status": "closed",
        "resolved_at": now,
        "related_ticket_id": data.primary_id,
        "summary": f"Merged into #{primary.get('number')} — {dup.get('summary') or dup.get('subject')}",
    })
    pod.table("ticket_events").create({
        "ticket_id": data.duplicate_id, "kind": "note", "actor": "merge",
        "detail": f"Closed as duplicate — merged into #{primary.get('number')}.",
    })
    pod.table("ticket_events").create({
        "ticket_id": data.primary_id, "kind": "note", "actor": "merge",
        "detail": f"Merged in #{dup.get('number')} ({moved} message(s)) as a duplicate.",
    })

    return MergeResult(ok=True, moved_messages=moved,
                       detail=f"Merged #{dup.get('number')} into #{primary.get('number')}.")
