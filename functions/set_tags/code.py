#input_type_name: SetTagsInput
#output_type_name: SetTagsResult
#function_name: set_tags

from typing import Any, List

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class SetTagsInput(BaseModel):
    ticket_id: str
    tags: List[Any] = []


class SetTagsResult(BaseModel):
    ok: bool


async def set_tags(ctx: FunctionContext, data: SetTagsInput) -> SetTagsResult:
    pod = Pod.from_env()
    clean = [str(t).strip() for t in (data.tags or []) if str(t).strip()]
    pod.table("tickets").update(data.ticket_id, {"tags": clean})
    return SetTagsResult(ok=True)
