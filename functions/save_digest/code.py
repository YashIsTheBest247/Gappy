#input_type_name: SaveDigestInput
#output_type_name: SaveDigestResult
#function_name: save_digest

from typing import Any, List, Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class SaveDigestInput(BaseModel):
    headline: str
    body: str
    highlights: List[Any] = []
    period: Optional[str] = "day"


class SaveDigestResult(BaseModel):
    report_id: str


async def save_digest(ctx: FunctionContext, data: SaveDigestInput) -> SaveDigestResult:
    pod = Pod.from_env()
    row = pod.table("reports").create({
        "headline": data.headline,
        "body": data.body,
        "highlights": data.highlights,
        "period": data.period or "day",
    })
    return SaveDigestResult(report_id=str(row["id"]))
