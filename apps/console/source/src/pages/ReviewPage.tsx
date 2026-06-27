import React from "react";
import { useTickets, Ticket } from "../lib/podData";
import { Card, StatusPill, PriorityTag, Badge, Loading, Empty, Btn } from "../lib/ui";
import { go } from "../lib/router";
import { timeAgo, slaState } from "../lib/format";

function ReviewCard({ t }: { t: Ticket }) {
  const sla = slaState(t.sla_due_at);
  return (
    <Card className="compact">
      <div className="between" style={{ alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div className="wrap" style={{ marginBottom: 8 }}>
            <span className="muted-text" style={{ fontSize: 12 }}>#{t.number ?? "—"}</span>
            <PriorityTag priority={t.priority} />
            {t.category && <Badge>{t.category}</Badge>}
            {typeof t.confidence === "number" && (
              <Badge variant="outline">draft confidence {Math.round(t.confidence * 100)}%</Badge>
            )}
            {sla?.overdue && <Badge variant="ember">{sla.label}</Badge>}
          </div>
          <h3 style={{ fontSize: 18 }}>{t.subject}</h3>
          <p className="muted-text" style={{ margin: "6px 0 0" }}>
            {t.customer_name ? `${t.customer_name} · ` : ""}{t.summary}
          </p>
        </div>
        <div className="stack" style={{ alignItems: "flex-end", gap: 10, flex: "0 0 auto" }}>
          <StatusPill status={t.status} />
          <Btn size="sm" onClick={() => go(`#/ticket/${t.id}`)}>Review draft →</Btn>
          <span className="muted-text" style={{ fontSize: 12 }}>{timeAgo(t.created_at)}</span>
        </div>
      </div>
    </Card>
  );
}

export default function ReviewPage() {
  const { tickets, isLoading } = useTickets([
    { field: "status", op: "eq", value: "awaiting_approval" },
  ]);

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Review</h1>
        <p className="page-sub">Drafts the AI prepared — approve, edit, or send back in one click.</p>
      </div>

      {isLoading ? (
        <Loading label="Loading drafts" />
      ) : tickets.length === 0 ? (
        <Card><Empty>Nothing waiting on you. The AI will queue drafts here as tickets arrive.</Empty></Card>
      ) : (
        <div className="grid" style={{ gap: 14 }}>
          {tickets.map((t) => <ReviewCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}
