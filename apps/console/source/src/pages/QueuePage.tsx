import React, { useEffect, useRef, useState } from "react";
import { useTickets, useFunctionRunner, useIntakeWorkflow, useMe, useSnoozes, Ticket } from "../lib/podData";
import { Card, Stat, StatusPill, PriorityTag, Badge, Btn, Loading, Empty } from "../lib/ui";
import { go } from "../lib/router";
import { toast } from "../lib/toast";
import { downloadCsv } from "../lib/extras";
import { CHANNEL_LABEL, timeAgo, slaState } from "../lib/format";

type SavedView = { name: string; filter: string; priority: string; query: string; mineOnly: boolean };

const FILTERS: { key: string; label: string; match: (t: Ticket) => boolean }[] = [
  { key: "open", label: "Open", match: (t) => !["answered", "closed"].includes(t.status) },
  { key: "new", label: "New", match: (t) => t.status === "new" },
  { key: "awaiting_approval", label: "Awaiting approval", match: (t) => t.status === "awaiting_approval" },
  { key: "escalated", label: "Escalated", match: (t) => t.status === "escalated" },
  { key: "answered", label: "Answered", match: (t) => t.status === "answered" },
  { key: "snoozed", label: "Snoozed", match: () => true },
  { key: "all", label: "All", match: () => true },
];

function TicketRow({ t, selectMode, checked, onToggle, highlighted }: { t: Ticket; selectMode?: boolean; checked?: boolean; onToggle?: () => void; highlighted?: boolean }) {
  const sla = slaState(t.sla_due_at);
  return (
    <div className={`row ${highlighted ? "row-hl" : ""}`} role="button" onClick={() => (selectMode ? onToggle?.() : go(`#/ticket/${t.id}`))}>
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
  const { snoozedIds } = useSnoozes();
  const escalate = useFunctionRunner("escalate_ticket");
  const wf = useIntakeWorkflow();
  const [hi, setHi] = useState(0);
  const [views, setViews] = useState<SavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem("desk-views") || "[]"); } catch { return []; }
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const shownRef = useRef<Ticket[]>([]);
  const hiRef = useRef(0);

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
    .filter((t) => (filter === "snoozed" ? snoozedIds.has(t.id) : filter === "all" ? true : !snoozedIds.has(t.id)))
    .filter((t) => !mineOnly || (me.id && t.assignee_user_id === me.id))
    .filter((t) => priority === "all" || t.priority === priority)
    .filter((t) =>
      !q ||
      [t.subject, t.customer_name, t.customer_email, t.summary, t.category, ...(t.tags ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );

  shownRef.current = shown;
  hiRef.current = hi;
  useEffect(() => { setHi((i) => Math.min(i, Math.max(0, shown.length - 1))); }, [shown.length]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "/" && !typing) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const list = shownRef.current;
      if (e.key === "j") { e.preventDefault(); setHi((i) => Math.min(i + 1, list.length - 1)); }
      else if (e.key === "k") { e.preventDefault(); setHi((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") { const t = list[hiRef.current]; if (t) go(`#/ticket/${t.id}`); }
      else if (e.key === "n") { go("#/new"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const persistViews = (v: SavedView[]) => { setViews(v); try { localStorage.setItem("desk-views", JSON.stringify(v)); } catch { /* ignore */ } };
  const saveView = () => {
    const name = [active.label, priority !== "all" ? priority : "", mineOnly ? "mine" : "", q ? `“${query.trim()}”` : ""].filter(Boolean).join(" · ") || "View";
    persistViews([...views.filter((x) => x.name !== name), { name, filter, priority, query, mineOnly }]);
    toast("View saved", "ok");
  };
  const applyView = (v: SavedView) => { setFilter(v.filter); setPriority(v.priority); setQuery(v.query); setMineOnly(v.mineOnly); };
  const exportCsv = () => downloadCsv("tend-tickets.csv", shown, [
    { key: "number", label: "#" }, { key: "subject", label: "Subject" }, { key: "status", label: "Status" },
    { key: "priority", label: "Priority" }, { key: "category", label: "Category" }, { key: "sentiment", label: "Sentiment" },
    { key: "customer_name", label: "Customer" }, { key: "customer_email", label: "Email" }, { key: "channel", label: "Channel" }, { key: "created_at", label: "Created" },
  ]);

  return (
    <div>
      <div className="page-head between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Queue</h1>
          <p className="page-sub">Every request auto-triaged, drafted &amp; QA-graded the moment it lands.</p>
        </div>
        <div className="wrap">
          <button className="btn btn-sm btn-soft" onClick={exportCsv}>Export CSV</button>
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
        ref={searchRef}
        className="input"
        style={{ marginBottom: 14 }}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by subject, customer, tag, category…   ( / to focus, j/k to move, enter to open )"
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

      <div className="wrap" style={{ marginBottom: 12 }}>
        <button className="btn btn-soft btn-sm" onClick={saveView}>★ Save view</button>
        {views.map((v) => (
          <span key={v.name} className="btn btn-soft btn-sm" style={{ gap: 8 }}>
            <span onClick={() => applyView(v)} style={{ cursor: "pointer" }}>{v.name}</span>
            <span onClick={() => persistViews(views.filter((x) => x.name !== v.name))} style={{ cursor: "pointer", opacity: 0.55 }}>×</span>
          </span>
        ))}
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
          {shown.map((t, i) => (
            <TicketRow key={t.id} t={t} selectMode={selectMode} checked={sel.has(t.id)} onToggle={() => toggle(t.id)} highlighted={!selectMode && i === hi} />
          ))}
        </div>
      )}
    </div>
  );
}
