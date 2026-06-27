#input_type_name: DecideInput
#output_type_name: DecideResult
#function_name: decide_reply

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class DecideInput(BaseModel):
    ticket_id: str
    draft_id: str
    decision: str                      # "approve" | "reject"
    edited_body: Optional[str] = None  # final text if the reviewer tweaked it
    notes: Optional[str] = None        # required-in-spirit on reject; feeds the re-draft


class DecideResult(BaseModel):
    ok: bool
    status: str


async def decide_reply(ctx: FunctionContext, data: DecideInput) -> DecideResult:
    pod = Pod.from_env()
    now = datetime.now(timezone.utc).isoformat()
    reviewer = ctx.user_email or "reviewer"

    if data.decision == "approve":
        draft = pod.table("drafts").get(data.draft_id)
        final_body = data.edited_body or draft.get("body", "")

        pod.table("drafts").update(data.draft_id, {
            "status": "sent",
            "body": final_body,
            "review_notes": data.notes,
        })

        ticket = pod.table("tickets").get(data.ticket_id)
        pod.table("messages").create({
            "ticket_id": data.ticket_id,
            "direction": "outbound",
            "channel": ticket.get("channel", "email"),
            "author": "Support team",
            "body": final_body,
        })

        ticket_update = {"status": "answered", "resolved_at": now}
        if not ticket.get("first_response_at"):
            ticket_update["first_response_at"] = now
        pod.table("tickets").update(data.ticket_id, ticket_update)

        pod.table("ticket_events").create({
            "ticket_id": data.ticket_id,
            "kind": "sent",
            "actor": reviewer,
            "detail": "Approved and sent reply to customer.",
        })

        # Optional real delivery via a connected Gmail account. Best-effort: never block
        # the approval if no connector is configured.
        try:
            if ticket.get("channel") == "email" and ticket.get("customer_email"):
                pod.connectors.execute(
                    "workspace-gmail",
                    "GMAIL_SEND_EMAIL",
                    {
                        "recipient_email": ticket["customer_email"],
                        "subject": f"Re: {ticket.get('subject', 'your request')}",
                        "body": final_body,
                    },
                )
        except Exception:
            pass

        return DecideResult(ok=True, status="answered")

    # reject -> back to the queue for a re-draft
    pod.table("drafts").update(data.draft_id, {
        "status": "rejected",
        "review_notes": data.notes,
    })
    pod.table("tickets").update(data.ticket_id, {"status": "triaged"})
    pod.table("ticket_events").create({
        "ticket_id": data.ticket_id,
        "kind": "rejected",
        "actor": reviewer,
        "detail": data.notes or "Draft rejected; needs another pass.",
    })
    return DecideResult(ok=True, status="triaged")
