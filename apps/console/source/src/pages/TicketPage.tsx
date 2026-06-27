import React, { useEffect, useState } from "react";
import {
  useTicket, useMessages, useDrafts, useEvents, useFunctionRunner, Draft,
} from "../lib/podData";
import { Card, Btn, Badge, StatusPill, PriorityTag, CategoryTag, Avatar, Loading, Empty } from "../lib/ui";
import { go } from "../lib/router";
import { CHANNEL_LABEL, timeAgo, slaState } from "../lib/format";

function Conversation({ ticketId }: { ticketId: string }) {
  const { messages, isLoading } = useMessages(ticketId);
  if (isLoading) return <Loading label="Loading conversation" />;
  return (
    <div className="grid" style={{ gap: 14 }}>
      {messages.map((m) => (
        <div key={m.id} className="card-row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
          <Avatar name={m.author} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="between">
              <strong style={{ fontSize: 13 }}>{m.author || "Unknown"}</strong>
              <span className="muted-text" style={{ fontSize: 12 }}>
                <Badge variant="outline">{m.direction}</Badge> {timeAgo(m.created_at)}
              </span>
            </div>
            <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{m.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DraftPanel({ ticketId, draft }: { ticketId: string; draft: Draft | null }) {
  const decide = useFunctionRunner("decide_reply");
  const [body, setBody] = useState(draft?.body ?? "");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => { setBody(draft?.body ?? ""); }, [draft?.id]);

  if (!draft) {
    return <Card className="muted compact"><Empty>No draft yet — the AI is still working, or this ticket was escalated.</Empty></Card>;
  }
  const d = draft;

  if (d.status === "sent") {
    return (
      <Card className="compact">
        <div className="wrap" style={{ marginBottom: 10 }}><Badge>Sent</Badge>
          <span className="muted-text">v{d.version} · approved by {d.review_notes ? "reviewer" : "reviewer"}</span>
        </div>
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{d.body}</p>
      </Card>
    );
  }

  async function submit(decision: "approve" | "reject") {
    if (decision === "reject" && !notes.trim()) {
      alert("Add a note so the AI can re-d.");
      return;
    }
    await decide.run({
      ticket_id: ticketId,
      draft_id: d.id,
      decision,
      edited_body: decision === "approve" ? body : undefined,
      notes: notes.trim() || undefined,
    });
    setDone(decision === "approve" ? "Reply approved & sent." : "Sent back for a re-d.");
  }

  return (
    <Card className="compact">
      <div className="between" style={{ marginBottom: 12 }}>
        <div className="wrap">
          <Badge variant="ember">Draft v{d.version}</Badge>
          {typeof d.confidence === "number" && (
            <Badge variant="outline">confidence {Math.round(d.confidence * 100)}%</Badge>
          )}
        </div>
        <span className="muted-text" style={{ fontSize: 12 }}>{timeAgo(d.created_at)}</span>
      </div>

      <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} />

      {d.citations && d.citations.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="stat-label" style={{ marginBottom: 6 }}>Grounded in</div>
          <div className="grid" style={{ gap: 6 }}>
            {d.citations.map((c, i) => (
              <div key={i} className="card muted compact" style={{ padding: "10px 14px", borderRadius: 16 }}>
                <Badge variant="outline">{c.path}</Badge>
                {c.quote && <span className="muted-text" style={{ marginLeft: 8 }}>“{c.quote}”</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="field" style={{ marginTop: 16 }}>
        <label>Reviewer note (required to send back)</label>
        <input className="input" value={notes} placeholder="e.g. mention the 14-day window explicitly"
               onChange={(e) => setNotes(e.target.value)} />
      </div>

      {done ? (
        <Badge>{done}</Badge>
      ) : (
        <div className="wrap">
          <Btn variant="accent" onClick={() => submit("approve")} disabled={decide.busy}>
            {decide.busy ? "Sending…" : "Approve & send"}
          </Btn>
          <Btn variant="ghost" onClick={() => submit("reject")} disabled={decide.busy}>Send back</Btn>
        </div>
      )}
    </Card>
  );
}

function Timeline({ ticketId }: { ticketId: string }) {
  const { events } = useEvents(ticketId);
  if (events.length === 0) return null;
  return (
    <Card className="compact">
      <h3 style={{ fontSize: 18, marginBottom: 14 }}>Activity</h3>
      <div className="grid" style={{ gap: 12 }}>
        {events.map((e) => (
          <div key={e.id} className="card-row" style={{ flexWrap: "nowrap", gap: 12 }}>
            <span className="dot s-triaged" style={{ marginTop: 7 }} />
            <div style={{ flex: 1 }}>
              <div className="between">
                <strong style={{ fontSize: 13, textTransform: "capitalize" }}>{e.kind}</strong>
                <span className="muted-text" style={{ fontSize: 12 }}>{e.actor} · {timeAgo(e.created_at)}</span>
              </div>
              {e.detail && <p className="muted-text" style={{ margin: "2px 0 0", fontSize: 13 }}>{e.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function TicketPage({ id }: { id: string }) {
  const { ticket, isLoading } = useTicket(id);
  const { drafts } = useDrafts(id);
  const escalate = useFunctionRunner("escalate_ticket");
  const latest = drafts[0] ?? null;
  const sla = slaState(ticket?.sla_due_at);

  if (isLoading) return <Loading label="Loading ticket" />;
  if (!ticket) return <Card><Empty>Ticket not found.</Empty></Card>;

  return (
    <div>
      <div className="page-head">
        <button className="btn btn-soft btn-sm" onClick={() => go("#/queue")}>← Queue</button>
      </div>

      <div className="between" style={{ alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title" style={{ fontSize: 28 }}>#{ticket.number ?? "—"} · {ticket.subject}</h1>
          <p className="page-sub">
            {ticket.customer_name} {ticket.customer_email ? `· ${ticket.customer_email}` : ""} ·{" "}
            {CHANNEL_LABEL[ticket.channel] ?? ticket.channel}
          </p>
        </div>
        <Btn variant="ghost" size="sm" disabled={escalate.busy}
             onClick={() => escalate.run({ ticket_id: ticket.id, reason: "Manually escalated from console." })}>
          Escalate
        </Btn>
      </div>

      <div className="wrap" style={{ marginBottom: 24 }}>
        <StatusPill status={ticket.status} />
        <PriorityTag priority={ticket.priority} />
        <CategoryTag category={ticket.category} />
        {ticket.sentiment && <Badge variant="outline">sentiment: {ticket.sentiment}</Badge>}
        {sla && <Badge variant={sla.overdue ? "ember" : "outline"}>{sla.label}</Badge>}
        {(ticket.tags ?? []).map((tag) => <Badge key={tag}>{tag}</Badge>)}
      </div>

      <div className="split-wide">
        <div className="grid" style={{ gap: 20 }}>
          <Card>
            <h3 style={{ fontSize: 18, marginBottom: 16 }}>Conversation</h3>
            <Conversation ticketId={ticket.id} />
          </Card>
          <DraftPanel ticketId={ticket.id} draft={latest} />
        </div>
        <Timeline ticketId={ticket.id} />
      </div>
    </div>
  );
}
