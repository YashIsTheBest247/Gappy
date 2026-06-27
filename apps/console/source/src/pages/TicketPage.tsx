import React, { useEffect, useState } from "react";
import {
  useTicket, useMessages, useDrafts, useEvents, useFunctionRunner, useIntakeWorkflow, useWriteKbWorkflow, useTickets, useQuality, useCsat, useMacros, useMe, Draft, Ticket,
} from "../lib/podData";
import { Card, Btn, Badge, StatusPill, PriorityTag, CategoryTag, Avatar, Loading, Empty } from "../lib/ui";
import { go } from "../lib/router";
import { toast } from "../lib/toast";
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
  const { macros } = useMacros();
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
      toast("Add a note so the AI can re-draft.", "err");
      return;
    }
    await decide.run({
      ticket_id: ticketId,
      draft_id: d.id,
      decision,
      edited_body: decision === "approve" ? body : undefined,
      notes: notes.trim() || undefined,
    });
    if (decision === "approve") {
      setDone("Reply approved & sent.");
      toast("Reply approved & sent ✓", "ok");
    } else {
      setDone("Sent back for a re-draft.");
      toast("Sent back — re-run the AI to draft again.", "info");
    }
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

      {macros.length > 0 && (
        <div className="wrap" style={{ marginBottom: 10 }}>
          <span className="muted-text" style={{ fontSize: 12 }}>Insert macro:</span>
          {macros.map((m) => (
            <button key={m.id} className="btn btn-soft btn-sm"
              onClick={() => setBody((b) => (b.trim() ? b.trim() + "\n\n" : "") + m.body)}>{m.name}</button>
          ))}
        </div>
      )}
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

const STOP = new Set("the a an to of for is are i we you my our your it this that and or with on in be can how do does my".split(" "));
function keywords(s?: string): string[] {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
}

function Similar({ ticket }: { ticket: Ticket }) {
  const { tickets } = useTickets();
  const kw = new Set(keywords(`${ticket.subject} ${ticket.summary ?? ""}`));
  const scored = tickets
    .filter((t) => t.id !== ticket.id)
    .map((t) => {
      const overlap = keywords(`${t.subject} ${t.summary ?? ""}`).filter((w) => kw.has(w)).length;
      const score = overlap * 2 + (t.category === ticket.category ? 1 : 0);
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (scored.length === 0) return null;
  return (
    <Card className="compact">
      <h3 style={{ fontSize: 18, marginBottom: 14 }}>Similar tickets</h3>
      <div className="grid" style={{ gap: 8 }}>
        {scored.map(({ t }) => (
          <div key={t.id} className="row" style={{ padding: "12px 16px" }} onClick={() => go(`#/ticket/${t.id}`)}>
            <div className="row-num">#{t.number ?? "—"}</div>
            <div className="row-main">
              <div className="row-subject" style={{ fontSize: 14 }}>{t.subject}</div>
            </div>
            <StatusPill status={t.status} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function Duplicates({ ticket }: { ticket: Ticket }) {
  const { tickets } = useTickets();
  const merge = useFunctionRunner("merge_tickets");
  const [mergedIds, setMergedIds] = useState<Set<string>>(new Set());
  const email = (ticket.customer_email ?? "").toLowerCase();
  if (!email) return null;

  const dupes = tickets.filter(
    (t) => t.id !== ticket.id
      && (t.customer_email ?? "").toLowerCase() === email
      && !["closed", "answered"].includes(t.status)
      && !mergedIds.has(t.id)
  );
  if (dupes.length === 0) return null;

  async function doMerge(dupId: string, num?: number) {
    await merge.run({ primary_id: ticket.id, duplicate_id: dupId });
    setMergedIds((s) => new Set(s).add(dupId));
    toast(`Merged #${num ?? "?"} into this ticket`, "ok");
  }

  return (
    <Card className="compact" style={{ borderColor: "var(--accent)" }}>
      <div className="between" style={{ marginBottom: 6 }}>
        <h3 style={{ fontSize: 18 }}>Possible duplicates</h3>
        <Badge variant="ember">{dupes.length}</Badge>
      </div>
      <p className="muted-text" style={{ fontSize: 13, marginBottom: 12 }}>
        Same customer has other open tickets. Merge them in to keep one thread.
      </p>
      <div className="grid" style={{ gap: 8 }}>
        {dupes.map((t) => (
          <div key={t.id} className="card-row" style={{ flexWrap: "nowrap", gap: 10 }}>
            <div className="row-num">#{t.number ?? "—"}</div>
            <div className="row-main" style={{ cursor: "pointer" }} onClick={() => go(`#/ticket/${t.id}`)}>
              <div className="row-subject" style={{ fontSize: 14 }}>{t.subject}</div>
            </div>
            <Btn size="sm" variant="soft" disabled={merge.busy} onClick={() => doMerge(t.id, t.number)}>Merge in</Btn>
          </div>
        ))}
      </div>
    </Card>
  );
}

const VERDICT_CLASS: Record<string, string> = { ship: "v-ship", revise: "v-revise", escalate: "v-escalate" };

function QAReview({ ticketId }: { ticketId: string }) {
  const { quality } = useQuality(ticketId);
  if (!quality) return null;
  const v = quality.verdict ?? "revise";
  return (
    <Card className="compact qa-card">
      <div className="between" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 18 }}>AI quality check</h3>
        <span className={`qa-verdict ${VERDICT_CLASS[v] ?? "v-revise"}`}>{v}</span>
      </div>
      <div className="qa-top">
        <div className={`qa-score ${VERDICT_CLASS[v] ?? "v-revise"}`}>
          {quality.score ?? "—"}<span>/100</span>
        </div>
        <div className="wrap">
          {quality.tone && <Badge variant="outline">tone: {quality.tone}</Badge>}
          {quality.grounding && <Badge variant="outline">{quality.grounding}</Badge>}
        </div>
      </div>
      {(quality.issues ?? []).length > 0 && (
        <ul className="qa-issues">
          {(quality.issues ?? []).map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      )}
      {quality.suggestion && <div className="qa-suggest">💡 {quality.suggestion}</div>}
      <p className="muted-text" style={{ fontSize: 12, marginTop: 12 }}>Second-opinion review by the reply-coach agent.</p>
    </Card>
  );
}

function CsatWidget({ ticket }: { ticket: Ticket }) {
  const { csat } = useCsat(ticket.id);
  const rec = useFunctionRunner("record_csat");
  const [done, setDone] = useState(false);
  if (!["answered", "closed"].includes(ticket.status)) return null;

  if (csat) {
    return (
      <Card className="compact">
        <div className="between"><h3 style={{ fontSize: 18 }}>Customer satisfaction</h3>
          <span className="qa-verdict v-ship">{csat.rating}/5</span></div>
        {csat.comment && <p className="muted-text" style={{ marginTop: 8 }}>{csat.comment}</p>}
      </Card>
    );
  }
  if (done) return <Card className="compact"><Badge>Thanks — feedback recorded ✓</Badge></Card>;

  async function rate(r: number) {
    await rec.run({ ticket_id: ticket.id, rating: r });
    setDone(true);
    toast(`Customer satisfaction logged: ${r}/5`, "ok");
  }
  return (
    <Card className="compact">
      <h3 style={{ fontSize: 18, marginBottom: 4 }}>How did we do?</h3>
      <p className="muted-text" style={{ fontSize: 13, marginBottom: 12 }}>Capture the customer's rating once they reply.</p>
      <div className="wrap">
        {[1, 2, 3, 4, 5].map((r) => (
          <button key={r} className="btn btn-soft" onClick={() => rate(r)} disabled={rec.busy}>{r} ★</button>
        ))}
      </div>
    </Card>
  );
}

function TagsEditor({ ticket }: { ticket: Ticket }) {
  const setTags = useFunctionRunner("set_tags");
  const [tags, setTagsState] = useState<string[]>(ticket.tags ?? []);
  const [input, setInput] = useState("");
  useEffect(() => { setTagsState(ticket.tags ?? []); }, [ticket.id]);
  const save = (next: string[]) => { setTagsState(next); setTags.run({ ticket_id: ticket.id, tags: next }); };
  const add = () => { const t = input.trim().toLowerCase(); if (t && !tags.includes(t)) save([...tags, t]); setInput(""); };
  return (
    <Card className="compact">
      <h3 style={{ fontSize: 18, marginBottom: 12 }}>Tags</h3>
      <div className="wrap" style={{ marginBottom: 12 }}>
        {tags.map((t) => (
          <span key={t} className="badge">{t}<span style={{ cursor: "pointer", opacity: 0.7, marginLeft: 2 }} onClick={() => save(tags.filter((x) => x !== t))}>×</span></span>
        ))}
        {tags.length === 0 && <span className="muted-text" style={{ fontSize: 13 }}>No tags yet.</span>}
      </div>
      <div className="card-row" style={{ flexWrap: "nowrap" }}>
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Add a tag…" />
        <Btn size="sm" variant="soft" onClick={add}>Add</Btn>
      </div>
    </Card>
  );
}

export default function TicketPage({ id }: { id: string }) {
  const { ticket, isLoading } = useTicket(id);
  const { drafts } = useDrafts(id);
  const escalate = useFunctionRunner("escalate_ticket");
  const wf = useIntakeWorkflow();
  const kb = useWriteKbWorkflow();
  const me = useMe();
  const assign = useFunctionRunner("assign_ticket");
  const snooze = useFunctionRunner("snooze_ticket");
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
        <div className="wrap" style={{ flexWrap: "nowrap" }}>
          <Btn variant="accent" size="sm" disabled={wf.starting}
               onClick={async () => { try { await wf.start(ticket.id); toast("AI is re-running — triage & draft…", "ok"); } catch { toast("Couldn't start the AI.", "err"); } }}>
            {wf.starting ? "Running…" : "Run AI"}
          </Btn>
          <Btn variant="soft" size="sm" disabled={kb.starting}
               onClick={async () => { try { await kb.start(ticket.id); toast("AI is writing a KB article from this ticket…", "ok"); } catch { toast("Couldn't start the KB writer.", "err"); } }}>
            {kb.starting ? "Writing…" : "Write KB article"}
          </Btn>
          <Btn variant="soft" size="sm" disabled={assign.busy}
               onClick={async () => {
                 const mine = ticket.assignee_user_id === me.id;
                 await assign.run({ ticket_id: ticket.id, user_id: mine ? null : me.id, assignee_name: me.me?.first_name || me.me?.email });
                 toast(mine ? "Unassigned" : "Assigned to you", "ok");
               }}>
            {ticket.assignee_user_id && ticket.assignee_user_id === me.id ? "Assigned to you" : "Assign to me"}
          </Btn>
          <Btn variant="ghost" size="sm" disabled={escalate.busy}
               onClick={async () => { await escalate.run({ ticket_id: ticket.id, reason: "Manually escalated from console." }); toast("Ticket escalated", "info"); }}>
            Escalate
          </Btn>
          <Btn variant="soft" size="sm" disabled={snooze.busy}
               onClick={async () => { await snooze.run({ ticket_id: ticket.id, hours: 24 }); toast("Snoozed for 1 day", "info"); }}>
            Snooze 1d
          </Btn>
        </div>
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
          <QAReview ticketId={ticket.id} />
          <CsatWidget ticket={ticket} />
        </div>
        <div className="grid" style={{ gap: 20 }}>
          <Duplicates ticket={ticket} />
          <TagsEditor ticket={ticket} />
          <Similar ticket={ticket} />
          <Timeline ticketId={ticket.id} />
        </div>
      </div>
    </div>
  );
}
