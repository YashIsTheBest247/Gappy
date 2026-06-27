#input_type_name: SaveQualityInput
#output_type_name: SaveQualityResult
#function_name: save_quality

from typing import Any, List, Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class SaveQualityInput(BaseModel):
    ticket_id: str
    draft_id: str
    score: Optional[int] = None
    verdict: Optional[str] = None
    tone: Optional[str] = None
    grounding: Optional[str] = None
    issues: List[Any] = []
    suggestion: Optional[str] = None


class SaveQualityResult(BaseModel):
    quality_id: str


async def save_quality(ctx: FunctionContext, data: SaveQualityInput) -> SaveQualityResult:
    pod = Pod.from_env()

    row = pod.table("quality").create({
        "ticket_id": data.ticket_id,
        "draft_id": data.draft_id,
        "score": data.score,
        "verdict": data.verdict,
        "tone": data.tone,
        "grounding": data.grounding,
        "issues": data.issues,
        "suggestion": data.suggestion,
    })

    detail = f"QA: {data.score}/100 · {data.verdict} · tone {data.tone} · {data.grounding}"
    if data.suggestion:
        detail += f" — {data.suggestion}"
    pod.table("ticket_events").create({
        "ticket_id": data.ticket_id,
        "kind": "note",
        "actor": "reply-coach",
        "detail": detail,
    })

    return SaveQualityResult(quality_id=str(row["id"]))
