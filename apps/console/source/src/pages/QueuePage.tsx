import React, { useState } from "react";
import { useTickets, useFunctionRunner, useIntakeWorkflow, useMe, Ticket } from "../lib/podData";
import { Card, Stat, StatusPill, PriorityTag, Badge, Btn, Loading, Empty } from "../lib/ui";
import { go } from "../lib/router";
import { toast } from "../lib/toast";
import { CHANNEL_LABEL, timeAgo, slaState } from "../lib/format";

const FILTERS: { key: string; label: string; match: (t: Ticket) => boolean }[] = [
  { key: "open", label: "Open", match: (t) => !["answered", "closed"].includes(t.status) },
  { key: "new", label: "New", match: (t) => t.status === "new" },
  { key: "awaiting_approval", label: "Awaiting approval", match: (t) => t.status === "awaiting_approval" },
  { key: "escalated", label: "Escalated", match: (t) => t.status === "escalated" },
  { key: "answered", label: "Answered", match: (t) => t.status === "answered" },
  { key: "all", label: "All", match: () => true },
];

function TicketRow({ t, selectMode, checked, onToggle }: { t: Ticket; selectMode?: boolean; checked?: boolean; onToggle?: () => void }) {
  const sla = slaState(t.sla_due_at);
  return (
    <div className="row" role="button" onClick={() => (selectMode ? onToggle?.() : go(`#/ticket/${t.id}`))}>
      {selectMode && (
        <input type="checkbox" className="rowcheck" checked={!!checked} readOnly
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }} />
      )}
      <div className="row-num">#{t.number ?? "—"}</div>
      <div className="row-main">
        <div className="row-subject">{t.subject}</div>
        <div className="row-preview">
          {t.customer_name ? `${t.customer_name} · ` : ""}{t.summary || t.body_preview}
        </div>
      </div>
      <div className="row-meta">
        {sla && !["answered", "closed"].includes(t.status) && (
          <Badge variant={sla.overdue ? "ember" : "outline"}>{sla.label}</Badge>
        )}
        <Badge variant="outline">{CHANNEL_LABEL[t.channel] ?? t.channel}</Badge>
        <PriorityTag priority={t.priority} />
        <StatusPill status={t.status} />
        <span className="muted-text" style={{ fontSize: 12, width: 64, textAlign: "right" }}>
          {timeAgo(t.created_at)}
        </span>
      </div>
    </div>
  );
}

export default function QueuePage() {
  const { tickets, isLoading } = useTickets();
  const [filter, setFilter] = useState("open");
  const [priority, setPriority] = useState("all");
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const me = useMe();
  const escalate = useFunctionRunner("escalate_ticket");
  const wf = useIntakeWorkflow();

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSel(new Set());
  async function bulkEscalate() {
    const ids = [...sel];
    for (const id of ids) { try { await escalate.run({ ticket_id: id, reason: "Bulk-escalated from the queue." }); } catch { /* keep going */ } }
    toast(`Escalated ${ids.length} ${ids.length === 1 ? "ticket" : "tickets"}`, "info"); clearSel();
  }
  async function bulkRunAI() {
    const ids = [...sel];
    for (const id of ids) { try { await wf.start(id); } catch { /* keep going */ } }
    toast(`Re-ran the AI on ${ids.length} ${ids.length === 1 ? "ticket" : "tickets"}`, "ok"); clearSel();
  }

  const open = tickets.filter((t) => !["answered", "closed"].includes(t.status)).length;
  const awaiting = tickets.filter((t) => t.status === "awaiting_approval").length;
  const escalated = tickets.filter((t) => t.status === "escalated").length;
  const answered = tickets.filter((t) => t.status === "answered").length;

  const active = FILTERS.find((f) => f.key === filter)!;
  const q = query.trim().toLowerCase();
  const shown = tickets
    .filter(active.match)
    .filter((t) => !mineOnly || (me.id && t.assignee_user_id === me.id))
    .filter((t) => priority === "all" || t.priority === priority)
    .filter((t) =>
      !q ||
      [t.subject, t.customer_name, t.customer_email, t.summary, t.category, ...(t.tags ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );

  return (
    <div>
      <div className="page-head between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Queue</h1>
          <p className="page-sub">Every request auto-triaged, drafted &amp; QA-graded the moment it lands.</p>
        </div>
        <div className="wrap">
          <button className={`btn btn-sm ${selectMode ? "btn-primary" : "btn-soft"}`}
            onClick={() => { setSelectMode((m) => !m); clearSel(); }}>{selectMode ? "Done" : "Select"}</button>
          <span className="auto-pill">Autonomous mode</span>
        </div>
      </div>

      <div className="stats" style={{ marginBottom: 28 }}>
        <Stat num={open} label="Open tickets" tone="mint" />
        <Stat num={awaiting} label="Awaiting approval" tone="amber" />
        <Stat num={escalated} label="Escalated" tone="rose" />
        <Stat num={answered} label="Answered" tone="violet" />
      </div>

      <input
        className="input"
        style={{ marginBottom: 14 }}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by subject, customer, tag, category…"
      />

      <div className="between" style={{ flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div className="wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`btn btn-sm ${filter === f.key ? "btn-primary" : "btn-soft"}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="wrap">
          <button className={`btn btn-sm ${mineOnly ? "btn-accent" : "btn-soft"}`} onClick={() => setMineOnly((m) => !m)}>Mine</button>
          {["all", "urgent", "high", "normal", "low"].map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${priority === p ? "btn-accent" : "btn-soft"}`}
              onClick={() => setPriority(p)}
            >
              {p === "all" ? "Any priority" : p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="muted-text" style={{ fontSize: 13, marginBottom: 10 }}>
        {shown.length} {shown.length === 1 ? "ticket" : "tickets"}
      </div>

      {selectMode && sel.size > 0 && (
        <div className="bulkbar">
          <strong>{sel.size} selected</strong>
          <Btn size="sm" variant="ghost" onClick={bulkRunAI} disabled={wf.starting}>Run AI</Btn>
          <Btn size="sm" onClick={bulkEscalate} disabled={escalate.busy}>Escalate</Btn>
          <button className="btn btn-soft btn-sm" onClick={clearSel}>Clear</button>
        </div>
      )}

      {isLoading ? (
        <Loading label="Loading queue" />
      ) : shown.length === 0 ? (
        <Card><Empty>{q || priority !== "all" ? "No tickets match your filters." : "No tickets here yet. Create one from “+ New ticket”."}</Empty></Card>
      ) : (
        <div className="grid stagger-list" style={{ gap: 10 }}>
          {shown.map((t) => (
            <TicketRow key={t.id} t={t} selectMode={selectMode} checked={sel.has(t.id)} onToggle={() => toggle(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
