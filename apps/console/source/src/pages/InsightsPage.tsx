import React from "react";
import { useTickets, useAllQuality, useAllCsat, useLiveEvents, Ticket } from "../lib/podData";
import { Card, Stat, Loading, Empty, Badge } from "../lib/ui";
import { CATEGORY_LABEL, STATUS_LABEL } from "../lib/format";
import { go } from "../lib/router";

function durationStr(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function countBy(items: Ticket[], key: (t: Ticket) => string | undefined) {
  const map = new Map<string, number>();
  for (const t of items) {
    const k = key(t);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%`, background: color }} /></div>
      <div className="bar-value">{value}</div>
    </div>
  );
}

const CHANNELS = [
  { name: "Email", sub: "support@ inbox", live: true },
  { name: "In-app form", sub: "web widget", live: true },
  { name: "Slack", sub: "#support channel", live: true },
  { name: "Telegram", sub: "live bot · frontline agent", live: true },
];

const CAT_COLORS = ["#2f9e63", "#2f5e93", "#997213", "#b8423d", "#5b4a93", "#0e7c86", "#71717a"];
const PRIO_COLOR: Record<string, string> = { urgent: "#dc2626", high: "#ff5a00", normal: "#71717a", low: "#a1a1aa" };

export default function InsightsPage() {
  const { tickets, isLoading } = useTickets();
  const { quality } = useAllQuality();
  const { csat } = useAllCsat();
  const { events } = useLiveEvents(400);

  if (isLoading) return <Loading label="Crunching insights" />;

  const ev = (k: string) => events.filter((e) => e.kind === k).length;
  const sent = ev("sent");
  const rejected = ev("rejected");
  const acceptance = sent + rejected > 0 ? Math.round((sent / (sent + rejected)) * 100) : null;
  const perf: [string, React.ReactNode][] = [
    ["Triaged", ev("triaged")],
    ["Drafted", ev("drafted")],
    ["QA-graded", quality.length],
    ["Replies sent", sent],
    ["Auto-escalated", ev("escalated")],
    ["Draft acceptance", acceptance != null ? `${acceptance}%` : "—"],
  ];

  const rated = csat.filter((c) => typeof c.rating === "number");
  const avgCsat = rated.length ? rated.reduce((s, c) => s + (c.rating ?? 0), 0) / rated.length : null;

  const scored = quality.filter((q) => typeof q.score === "number");
  const avgQa = scored.length ? Math.round(scored.reduce((s, q) => s + (q.score ?? 0), 0) / scored.length) : null;
  const shipRate = scored.length ? Math.round((scored.filter((q) => q.verdict === "ship").length / scored.length) * 100) : null;

  const total = tickets.length;
  const resolved = tickets.filter((t) => ["answered", "closed"].includes(t.status));
  const open = tickets.filter((t) => !["answered", "closed"].includes(t.status));
  const resolutionRate = total ? Math.round((resolved.length / total) * 100) : 0;

  const responded = tickets.filter((t) => t.first_response_at && t.created_at);
  const avgResponseMs = responded.length
    ? responded.reduce((s, t) => s + (new Date(t.first_response_at!).getTime() - new Date(t.created_at!).getTime()), 0) / responded.length
    : 0;

  const now = Date.now();
  const atRisk = open.filter((t) => t.sla_due_at && new Date(t.sla_due_at).getTime() - now < 4 * 3600_000);

  const conf = tickets.filter((t) => typeof t.confidence === "number");
  const avgConf = conf.length ? Math.round((conf.reduce((s, t) => s + (t.confidence ?? 0), 0) / conf.length) * 100) : 0;

  const byCat = countBy(tickets, (t) => t.category);
  const byPrio = countBy(tickets, (t) => t.priority);
  const byStatus = countBy(tickets, (t) => t.status);
  const catMax = Math.max(1, ...byCat.map((x) => x[1]));
  const prioMax = Math.max(1, ...byPrio.map((x) => x[1]));
  const statusMax = Math.max(1, ...byStatus.map((x) => x[1]));

  const sentiments = { positive: 0, neutral: 0, negative: 0 } as Record<string, number>;
  tickets.forEach((t) => { if (t.sentiment) sentiments[t.sentiment] = (sentiments[t.sentiment] ?? 0) + 1; });

  // Knowledge gaps: drafted tickets where the AI's confidence was low → docs likely missing.
  const gaps = tickets
    .filter((t) => typeof t.confidence === "number" && (t.confidence ?? 1) < 0.6)
    .sort((a, b) => (a.confidence ?? 1) - (b.confidence ?? 1));

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Insights</h1>
        <p className="page-sub">Live health of your support desk — volume, speed, risk, and AI quality.</p>
      </div>

      <div className="stats" style={{ marginBottom: 22 }}>
        <Stat num={total} label="Total tickets" tone="sky" />
        <Stat num={`${resolutionRate}%`} label="Resolution rate" tone="mint" />
        <Stat num={responded.length ? durationStr(avgResponseMs) : "—"} label="Avg first response" tone="violet" />
        <Stat num={atRisk.length} label="SLA at risk" tone="rose" />
        <Stat num={conf.length ? `${avgConf}%` : "—"} label="Avg AI confidence" tone="amber" />
        <Stat num={avgQa != null ? avgQa : "—"} label="Avg QA score" tone="mint" />
        <Stat num={shipRate != null ? `${shipRate}%` : "—"} label="Drafts ready to ship" tone="sky" />
        <Stat num={avgCsat != null ? `${avgCsat.toFixed(1)}/5` : "—"} label="Avg CSAT" tone="amber" />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <div className="between" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontSize: 18 }}>Automation &amp; channels</h3>
          <span className="auto-pill">Autonomous mode ON</span>
        </div>
        <p className="muted-text" style={{ fontSize: 13.5, marginBottom: 16, maxWidth: 720 }}>
          Every ticket — from any channel — is auto-triaged, drafted from your docs, and graded by a second QA agent the
          moment it arrives. A human (or Autopilot) only approves.
        </p>
        <div className="chan-grid">
          {CHANNELS.map((c) => (
            <div key={c.name} className="chan">
              <span className={`dot ${c.live ? "s-answered" : "s-closed"}`} />
              <div>
                <div className="chan-name">{c.name}</div>
                <div className="chan-sub">{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, marginBottom: 4 }}>AI performance</h3>
        <p className="muted-text" style={{ fontSize: 13, marginBottom: 16 }}>What the agents did across the whole desk.</p>
        <div className="chan-grid">
          {perf.map(([label, val]) => (
            <div key={String(label)} className="card muted compact" style={{ padding: "14px 16px", borderRadius: 14 }}>
              <div className="stat-cap" style={{ marginBottom: 6 }}>{label}</div>
              <div className="stat-num" style={{ fontSize: 26 }}>{val}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="split" style={{ marginBottom: 20 }}>
        <Card>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>By category</h3>
          {byCat.length === 0 ? <Empty>No data yet.</Empty> : byCat.map(([k, v], i) => (
            <Bar key={k} label={CATEGORY_LABEL[k] ?? k} value={v} max={catMax} color={CAT_COLORS[i % CAT_COLORS.length]} />
          ))}
        </Card>
        <Card>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>By priority</h3>
          {byPrio.length === 0 ? <Empty>No data yet.</Empty> : byPrio.map(([k, v]) => (
            <Bar key={k} label={k[0].toUpperCase() + k.slice(1)} value={v} max={prioMax} color={PRIO_COLOR[k] ?? "#71717a"} />
          ))}
          <h3 style={{ fontSize: 18, margin: "22px 0 14px" }}>Sentiment</h3>
          <div className="wrap">
            <Badge>{sentiments.positive} positive</Badge>
            <Badge variant="outline">{sentiments.neutral} neutral</Badge>
            <Badge variant="ember">{sentiments.negative} negative</Badge>
          </div>
        </Card>
      </div>

      <div className="split">
        <Card>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>By status</h3>
          {byStatus.map(([k, v]) => (
            <Bar key={k} label={STATUS_LABEL[k] ?? k} value={v} max={statusMax} color="#2f9e63" />
          ))}
        </Card>

        <Card>
          <div className="between" style={{ marginBottom: 6 }}>
            <h3 style={{ fontSize: 18 }}>Knowledge gaps</h3>
            <Badge variant="ember">{gaps.length}</Badge>
          </div>
          <p className="muted-text" style={{ fontSize: 13, marginBottom: 14 }}>
            Tickets where the AI wasn’t confident — your docs probably don’t cover these. Write an article and the next one answers itself.
          </p>
          {gaps.length === 0 ? (
            <Empty>No gaps — the knowledge base is covering incoming questions. 🎉</Empty>
          ) : (
            <div className="grid" style={{ gap: 8 }}>
              {gaps.slice(0, 6).map((t) => (
                <div key={t.id} className="row" style={{ padding: "12px 16px" }} onClick={() => go(`#/ticket/${t.id}`)}>
                  <div className="row-main">
                    <div className="row-subject">{t.subject}</div>
                    <div className="row-preview">{CATEGORY_LABEL[t.category ?? ""] ?? t.category}</div>
                  </div>
                  <Badge variant="ember">{Math.round((t.confidence ?? 0) * 100)}% conf</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
