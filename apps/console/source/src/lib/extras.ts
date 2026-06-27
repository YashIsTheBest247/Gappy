// Small client-side utilities: CSV export + accent theming.

export function downloadCsv(filename: string, rows: Record<string, any>[], columns: { key: string; label: string }[]) {
  const esc = (v: any) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join(" | ") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => c.label).join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(",")).join("\n");
  const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const ACCENTS: { name: string; value: string }[] = [
  { name: "Green", value: "#2f9e63" },
  { name: "Blue", value: "#2f6fe0" },
  { name: "Violet", value: "#7c5cdb" },
  { name: "Rose", value: "#e0506e" },
  { name: "Amber", value: "#d68a17" },
  { name: "Teal", value: "#119c9c" },
];

export function setAccent(value: string) {
  const d = document.documentElement.style;
  d.setProperty("--accent", value);
  d.setProperty("--accent-soft", `color-mix(in srgb, ${value} 14%, transparent)`);
  try { localStorage.setItem("desk-accent", value); } catch { /* ignore */ }
}
