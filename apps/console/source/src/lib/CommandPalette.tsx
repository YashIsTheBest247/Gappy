import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTickets } from "./podData";
import { go } from "./router";
import { STATUS_LABEL } from "./format";
import { ACCENTS, setAccent } from "./extras";

type Item = { id: string; label: string; hint?: string; group: string; run: () => void };

function toggleTheme() {
  const cur = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("desk-theme", next); } catch {}
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tickets } = useTickets();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const close = (fn: () => void) => () => { fn(); onClose(); };
    const nav: Item[] = [
      { id: "n-queue", label: "Go to Queue", group: "Navigate", run: close(() => go("#/queue")) },
      { id: "n-review", label: "Go to Review", group: "Navigate", run: close(() => go("#/review")) },
      { id: "n-insights", label: "Go to Insights", group: "Navigate", run: close(() => go("#/insights")) },
      { id: "n-knowledge", label: "Go to Knowledge", group: "Navigate", run: close(() => go("#/knowledge")) },
      { id: "n-assistant", label: "Go to Assistant", group: "Navigate", run: close(() => go("#/assistant")) },
    ];
    const actions: Item[] = [
      { id: "a-new", label: "New ticket", hint: "create & run AI", group: "Actions", run: close(() => go("#/new")) },
      { id: "a-theme", label: "Toggle light / dark", group: "Actions", run: close(toggleTheme) },
    ];
    const appearance: Item[] = ACCENTS.map((acc) => ({
      id: `acc-${acc.value}`, label: `Accent: ${acc.name}`, hint: "theme color", group: "Appearance",
      run: close(() => setAccent(acc.value)),
    }));
    const ql = q.trim().toLowerCase();
    const tix: Item[] = tickets
      .filter((t) => !ql || [t.subject, t.customer_name, t.summary, t.category, `#${t.number}`]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(ql)))
      .slice(0, 6)
      .map((t) => ({
        id: `t-${t.id}`, label: `#${t.number ?? "—"} · ${t.subject}`,
        hint: STATUS_LABEL[t.status] ?? t.status, group: "Tickets",
        run: () => { go(`#/ticket/${t.id}`); onClose(); },
      }));

    const all = [...nav, ...actions, ...appearance, ...tix];
    if (!ql) return all;
    return all.filter((it) => it.label.toLowerCase().includes(ql) || it.group.toLowerCase().includes(ql) || it.id.startsWith("t-"));
  }, [q, tickets, onClose]);

  useEffect(() => { setSel((s) => Math.min(s, Math.max(0, items.length - 1))); }, [items.length]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); items[sel]?.run(); }
    else if (e.key === "Escape") { onClose(); }
  };

  let lastGroup = "";
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef} className="cmdk-input" value={q} onKeyDown={onKey}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          placeholder="Search tickets, jump to a page, run an action…"
        />
        <div className="cmdk-list">
          {items.length === 0 && <div className="cmdk-empty">No matches.</div>}
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? (lastGroup = it.group) : null;
            return (
              <React.Fragment key={it.id}>
                {head && <div className="cmdk-group">{head}</div>}
                <div
                  className={`cmdk-item ${i === sel ? "active" : ""}`}
                  onMouseEnter={() => setSel(i)} onClick={it.run}
                >
                  <span>{it.label}</span>
                  {it.hint && <span className="cmdk-hint">{it.hint}</span>}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="cmdk-foot"><span>↑↓ navigate</span><span>↵ select</span><span>esc close</span></div>
      </div>
    </div>
  );
}
