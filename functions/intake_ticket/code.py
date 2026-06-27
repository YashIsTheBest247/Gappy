#input_type_name: IntakeInput
#output_type_name: IntakeResult
#function_name: intake_ticket

from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class IntakeInput(BaseModel):
    subject: str
    body: str
    channel: str = "email"            # email | form | slack
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None


class IntakeResult(BaseModel):
    ticket_id: str
    number: Optional[int] = None


async def intake_ticket(ctx: FunctionContext, data: IntakeInput) -> IntakeResult:
    pod = Pod.from_env()

    # Default SLA before triage runs; apply_triage tightens this based on priority.
    sla_due = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    preview = (data.body or "")[:200]

    ticket = pod.table("tickets").create({
        "subject": data.subject,
        "body_preview": preview,
        "channel": data.channel,
        "customer_name": data.customer_name,
        "customer_email": data.customer_email,
        "status": "new",
        "sla_due_at": sla_due,
    })
    ticket_id = str(ticket["id"])

    pod.table("messages").create({
        "ticket_id": ticket_id,
        "direction": "inbound",
        "channel": data.channel,
        "author": data.customer_name or data.customer_email or "Customer",
        "body": data.body,
    })

    pod.table("ticket_events").create({
        "ticket_id": ticket_id,
        "kind": "created",
        "actor": "intake_ticket",
        "detail": f"New {data.channel} ticket: {data.subject}",
    })

    return IntakeResult(ticket_id=ticket_id, number=ticket.get("number"))
