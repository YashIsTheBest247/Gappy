import React, { useEffect, useState } from "react";
import { useRoute, go } from "./lib/router";
import { useTickets } from "./lib/podData";
import QueuePage from "./pages/QueuePage";
import ReviewPage from "./pages/ReviewPage";
import TicketPage from "./pages/TicketPage";
import KnowledgePage from "./pages/KnowledgePage";
import AssistantPage from "./pages/AssistantPage";
import NewTicketPage from "./pages/NewTicketPage";
import InsightsPage from "./pages/InsightsPage";
import { Toaster } from "./lib/toast";
import { Logo } from "./lib/Logo";

const NAV = [
  { key: "queue", label: "Queue", href: "#/queue" },
  { key: "review", label: "Review", href: "#/review" },
  { key: "insights", label: "Insights", href: "#/insights" },
  { key: "knowledge", label: "Knowledge", href: "#/knowledge" },
  { key: "assistant", label: "Assistant", href: "#/assistant" },
];

function useTheme(): [string, () => void] {
  // index.html already set documentElement.dataset.theme before paint — read it so there's no flash.
  const [theme, setTheme] = useState<string>(
    () => (typeof document !== "undefined" && document.documentElement.dataset.theme) || "light"
  );
  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("desk-theme", next); } catch {}
      return next;
    });
  };
  return [theme, toggle];
}

function Sidebar({ active, theme, toggleTheme }: { active: string; theme: string; toggleTheme: () => void }) {
  // Live counts so the operator always sees what needs attention.
  const { tickets } = useTickets();
  const open = tickets.filter((t) => !["answered", "closed"].includes(t.status)).length;
  const review = tickets.filter((t) => t.status === "awaiting_approval").length;
  const counts: Record<string, number | undefined> = { queue: open, review };

  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo size={38} className="brand-logo" />
        <div className="stack">
          <span className="brand-name">Tend</span>
          <span className="brand-sub">AI Support Desk</span>
        </div>
      </div>

      {NAV.map((n) => (
        <a key={n.key} href={n.href} className={`nav-link ${active === n.key ? "active" : ""}`}>
          <span>{n.label}</span>
          {counts[n.key] ? <span className="nav-count">{counts[n.key]}</span> : null}
        </a>
      ))}

      <div className="side-actions">
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          <span>{theme === "dark" ? "☀" : "☾"}</span>
          <span className="tlabel">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
        <button className="btn btn-primary" onClick={() => go("#/new")}>+ New ticket</button>
      </div>
    </aside>
  );
}

export default function App() {
  const route = useRoute();
  const [theme, toggleTheme] = useTheme();
  const active =
    route.name === "ticket" ? "queue" : route.name === "new" ? "queue" : route.name;

  return (
    <div className="shell">
      <Sidebar active={active} theme={theme} toggleTheme={toggleTheme} />
      <main className="main">
        <div className="main-inner">
          <div className="route-view" key={route.name === "ticket" ? `ticket-${route.id}` : route.name}>
            {route.name === "queue" && <QueuePage />}
            {route.name === "review" && <ReviewPage />}
            {route.name === "insights" && <InsightsPage />}
            {route.name === "ticket" && <TicketPage id={route.id} />}
            {route.name === "knowledge" && <KnowledgePage />}
            {route.name === "assistant" && <AssistantPage />}
            {route.name === "new" && <NewTicketPage />}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
