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
import CustomersPage from "./pages/CustomersPage";
import BriefingPage from "./pages/BriefingPage";
import { Toaster } from "./lib/toast";
import { Logo } from "./lib/Logo";
import { CommandPalette } from "./lib/CommandPalette";

const NAV = [
  { key: "queue", label: "Queue", href: "#/queue" },
  { key: "review", label: "Review", href: "#/review" },
  { key: "insights", label: "Insights", href: "#/insights" },
  { key: "customers", label: "Customers", href: "#/customers" },
  { key: "briefing", label: "Briefing", href: "#/briefing" },
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

function Sidebar({ active, theme, toggleTheme, openCmd }: { active: string; theme: string; toggleTheme: () => void; openCmd: () => void }) {
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
        <button className="theme-toggle" onClick={openCmd} aria-label="Search">
          <span>⌘K</span><span className="tlabel">Search</span>
        </button>
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
  const [cmdOpen, setCmdOpen] = useState(false);
  const active =
    route.name === "ticket" ? "queue" : route.name === "new" ? "queue" : route.name;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="shell">
      <Sidebar active={active} theme={theme} toggleTheme={toggleTheme} openCmd={() => setCmdOpen(true)} />
      <main className="main">
        <div className="main-inner">
          <div className="route-view" key={route.name === "ticket" ? `ticket-${route.id}` : route.name}>
            {route.name === "queue" && <QueuePage />}
            {route.name === "review" && <ReviewPage />}
            {route.name === "insights" && <InsightsPage />}
            {route.name === "customers" && <CustomersPage />}
            {route.name === "briefing" && <BriefingPage />}
            {route.name === "ticket" && <TicketPage id={route.id} />}
            {route.name === "knowledge" && <KnowledgePage />}
            {route.name === "assistant" && <AssistantPage />}
            {route.name === "new" && <NewTicketPage />}
          </div>
        </div>
      </main>
      <Toaster />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
