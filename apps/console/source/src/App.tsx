import React, { useEffect, useState } from "react";
import { useRoute, go } from "./lib/router";
import { useTickets } from "./lib/podData";
import QueuePage from "./pages/QueuePage";
import ReviewPage from "./pages/ReviewPage";
import TicketPage from "./pages/TicketPage";
import KnowledgePage from "./pages/KnowledgePage";
import AssistantPage from "./pages/AssistantPage";
import NewTicketPage from "./pages/NewTicketPage";

const NAV = [
  { key: "queue", label: "Queue", href: "#/queue" },
  { key: "review", label: "Review", href: "#/review" },
  { key: "knowledge", label: "Knowledge", href: "#/knowledge" },
  { key: "assistant", label: "Assistant", href: "#/assistant" },
];

function useTheme(): [string, () => void] {
  const [theme, setTheme] = useState<string>("light");
  useEffect(() => {
    const saved = localStorage.getItem("desk-theme");
    const initial = saved || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = initial;
    setTheme(initial);
  }, []);
  const toggle = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("desk-theme", next);
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
        <div className="brand-mark">S</div>
        <div className="stack">
          <span className="brand-name">Support Desk</span>
          <span className="brand-sub">AI triage &amp; reply</span>
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
          {route.name === "queue" && <QueuePage />}
          {route.name === "review" && <ReviewPage />}
          {route.name === "ticket" && <TicketPage id={route.id} />}
          {route.name === "knowledge" && <KnowledgePage />}
          {route.name === "assistant" && <AssistantPage />}
          {route.name === "new" && <NewTicketPage />}
        </div>
      </main>
    </div>
  );
}
