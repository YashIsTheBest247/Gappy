import React, { useState } from "react";
import { useTickets, Ticket } from "../lib/podData";
import { Card, Stat, StatusPill, PriorityTag, Badge, Loading, Empty } from "../lib/ui";
import { go } from "../lib/router";
import { CHANNEL_LABEL, timeAgo, slaState } from "../lib/format";

const FILTERS: { key: string; label: string; match: (t: Ticket) => boolean }[] = [
  { key: "open", label: "Open", match: (t) => !["answered", "closed"].includes(t.status) },
  { key: "new", label: "New", match: (t) => t.status === "new" },
  { key: "awaiting_approval", label: "Awaiting approval", match: (t) => t.status === "awaiting_approval" },
  { key: "escalated", label: "Escalated", match: (t) => t.status === "escalated" },
  { key: "answered", label: "Answered", match: (t) => t.status === "answered" },
  { key: "all", label: "All", match: () => true },
];

function TicketRow({ t }: { t: Ticket }) {
  const sla = slaState(t.sla_due_at);
  return (
    <div className="row" role="button" onClick={() => go(`#/ticket/${t.id}`)}>
      <div className="row-num">#{t.number ?? "—"}</div>
      <div className="row-main">
        <div className="row-subject">{t.subject}</div>
        <div className="row-preview">
          {t.customer_name ? `${t.customer_name} · ` : ""}{t.summary || t.body_preview}
        </div>
      </div>
      <div className="row-meta">
        {sla?.overdue && <Badge variant="ember">{sla.label}</Badge>}
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

  const open = tickets.filter((t) => !["answered", "closed"].includes(t.status)).length;
  const awaiting = tickets.filter((t) => t.status === "awaiting_approval").length;
  const escalated = tickets.filter((t) => t.status === "escalated").length;
  const answered = tickets.filter((t) => t.status === "answered").length;

  const active = FILTERS.find((f) => f.key === filter)!;
  const shown = tickets.filter(active.match);

  return (
    <div>
      <div className="page-head between">
        <div>
          <h1 className="page-title">Queue</h1>
          <p className="page-sub">Every support request, triaged and drafted automatically.</p>
        </div>
      </div>

      <div className="card-row" style={{ marginBottom: 28 }}>
        <Stat num={open} label="Open tickets" tone="mint" />
        <Stat num={awaiting} label="Awaiting approval" tone="amber" />
        <Stat num={escalated} label="Escalated" tone="rose" />
        <Stat num={answered} label="Answered" tone="violet" />
      </div>

      <div className="wrap" style={{ marginBottom: 16 }}>
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

      {isLoading ? (
        <Loading label="Loading queue" />
      ) : shown.length === 0 ? (
        <Card><Empty>No tickets here yet. Create one from “+ New ticket”.</Empty></Card>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {shown.map((t) => <TicketRow key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}
