import React from "react";
import { useReports, useLiveEvents, useDigestWorkflow, TicketEvent } from "../lib/podData";
import { Card, Btn, Badge, Loading, Empty } from "../lib/ui";
import { toast } from "../lib/toast";
import { timeAgo } from "../lib/format";

const EV_COLOR: Record<string, string> = {
  created: "#71717a", triaged: "#6366f1", escalated: "#dc2626", drafted: "#0e7c86",
  approved: "#16a34a", sent: "#16a34a", rejected: "#ff5a00", closed: "#a1a1aa", note: "#5b4a93",
};

function ActivityFeed() {
  const { events, isLoading, liveStatus } = useLiveEvents(40);
  return (
    <Card className="compact" style={{ position: "sticky", top: 16 }}>
      <div className="between" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 18 }}>Live activity</h3>
        <Badge variant="outline"><span className="dot s-answered" /> {liveStatus === "open" ? "live" : "syncing"}</Badge>
      </div>
      {isLoading ? <Loading label="Loading" /> : events.length === 0 ? <Empty>No activity yet.</Empty> : (
        <div className="grid" style={{ gap: 12, maxHeight: "62vh", overflowY: "auto" }}>
          {events.map((e: TicketEvent) => (
            <div key={e.id} className="card-row" style={{ flexWrap: "nowrap", gap: 11 }}>
              <span className="dot" style={{ marginTop: 7, background: EV_COLOR[e.kind] ?? "#71717a" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="between">
                  <strong style={{ fontSize: 13, textTransform: "capitalize" }}>{e.kind}</strong>
                  <span className="muted-text" style={{ fontSize: 12 }}>{e.actor} · {timeAgo(e.created_at)}</span>
                </div>
                {e.detail && <p className="muted-text" style={{ margin: "2px 0 0", fontSize: 13 }}>{e.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function BriefingPage() {
  const { reports, latest, isLoading } = useReports();
  const digest = useDigestWorkflow();

  async function generate() {
    try { await digest.start(); toast("Generating today's briefing…", "ok"); }
    catch { toast("Couldn't start the briefing.", "err"); }
  }

  return (
    <div>
      <div className="page-head between" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Briefing</h1>
          <p className="page-sub">An AI chief-of-staff summary of the whole desk — auto-written every morning.</p>
        </div>
        <Btn variant="accent" onClick={generate} disabled={digest.starting}>
          {digest.starting ? "Writing…" : "Generate now"}
        </Btn>
      </div>

      <div className="split-wide">
        <div className="grid" style={{ gap: 20 }}>
          {isLoading ? (
            <Loading label="Loading briefing" />
          ) : !latest ? (
            <Card><Empty>No briefing yet — hit “Generate now” to have the AI write one.</Empty></Card>
          ) : (
            <Card>
              <div className="between" style={{ marginBottom: 12 }}>
                <Badge variant="outline">latest · {timeAgo(latest.created_at)}</Badge>
              </div>
              <h2 style={{ fontSize: 24, lineHeight: 1.25, marginBottom: 14 }}>{latest.headline}</h2>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, color: "var(--ink-soft)" }}>{latest.body}</p>
              {(latest.highlights ?? []).length > 0 && (
                <div className="grid" style={{ gap: 8, marginTop: 18 }}>
                  {(latest.highlights ?? []).map((h, i) => (
                    <div key={i} className="card muted compact" style={{ padding: "12px 16px", borderRadius: 14 }}>
                      <span style={{ color: "var(--accent)", fontWeight: 700, marginRight: 8 }}>→</span>{String(h).replace(/<\/?[^>]+>/g, "").trim()}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {reports.length > 1 && (
            <Card className="compact">
              <h3 style={{ fontSize: 18, marginBottom: 14 }}>Earlier briefings</h3>
              <div className="grid" style={{ gap: 8 }}>
                {reports.slice(1).map((r) => (
                  <div key={r.id} className="card muted compact" style={{ padding: "12px 16px", borderRadius: 14 }}>
                    <div className="between">
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{r.headline}</span>
                      <span className="muted-text" style={{ fontSize: 12 }}>{timeAgo(r.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <ActivityFeed />
      </div>
    </div>
  );
}
