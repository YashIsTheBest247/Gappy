import React from "react";
import { STATUS_LABEL, CATEGORY_LABEL } from "./format";

export function Card({ className = "", children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "ghost" | "soft";
  size?: "md" | "sm";
  rect?: boolean;
};
const BTN_CLASS: Record<string, string> = {
  primary: "btn-primary", accent: "btn-accent", ghost: "btn-ghost", soft: "btn-soft",
};
export function Btn({ variant = "primary", size = "md", rect, className = "", children, ...rest }: BtnProps) {
  const cls = [
    "btn",
    BTN_CLASS[variant] ?? "btn-primary",
    size === "sm" ? "btn-sm" : "",
    rect ? "btn-rect" : "",
    className,
  ].join(" ");
  return <button className={cls} {...rest}>{children}</button>;
}

export function Badge({ children, variant = "filled" }: { children: React.ReactNode; variant?: "filled" | "outline" | "ember" }) {
  return <span className={`badge ${variant === "outline" ? "outline" : variant === "ember" ? "ember" : ""}`}>{children}</span>;
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className="badge outline">
      <span className={`dot s-${status}`} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PriorityTag({ priority }: { priority?: string }) {
  if (!priority) return null;
  return (
    <span className="badge outline">
      <span className={`dot p-${priority}`} />
      {priority[0].toUpperCase() + priority.slice(1)}
    </span>
  );
}

export function CategoryTag({ category }: { category?: string }) {
  if (!category) return null;
  return <Badge>{CATEGORY_LABEL[category] ?? category}</Badge>;
}

export function Stat({ num, label, tone }: { num: React.ReactNode; label: string; tone?: "mint" | "amber" | "rose" | "sky" | "violet" }) {
  return (
    <div className={`stat ${tone ?? ""}`} style={{ flex: "1 1 170px" }}>
      <div className="stat-cap">{label}</div>
      <div className="stat-num">{num}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="empty">
      <span className="spinner-dot" /> <span style={{ marginLeft: 8 }}>{label}…</span>
    </div>
  );
}

export function Avatar({ name }: { name?: string | null }) {
  const init = (name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span style={{
      width: 32, height: 32, borderRadius: 12, background: "var(--color-fog)",
      color: "var(--color-graphite)", display: "grid", placeItems: "center",
      fontSize: 12, fontWeight: 600, flex: "0 0 auto",
    }}>{init}</span>
  );
}
