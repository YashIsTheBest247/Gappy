export type Status =
  | "new" | "triaged" | "awaiting_approval" | "answered" | "escalated" | "closed";
export type Priority = "low" | "normal" | "high" | "urgent";

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  awaiting_approval: "Awaiting approval",
  answered: "Answered",
  escalated: "Escalated",
  closed: "Closed",
};

export const CATEGORY_LABEL: Record<string, string> = {
  billing: "Billing",
  bug: "Bug",
  howto: "How-to",
  feature_request: "Feature request",
  account: "Account",
  outage: "Outage",
  other: "Other",
};

export const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  form: "In-app form",
  slack: "Slack",
  system: "System",
};

export function timeAgo(value?: string | null): string {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function slaState(value?: string | null): { label: string; overdue: boolean } | null {
  if (!value) return null;
  const due = new Date(value).getTime();
  if (Number.isNaN(due)) return null;
  const diff = due - Date.now();
  if (diff < 0) return { label: "SLA overdue", overdue: true };
  const hrs = Math.round(diff / 3600000);
  if (hrs < 1) return { label: "SLA < 1h", overdue: false };
  return { label: `SLA in ${hrs}h`, overdue: false };
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}
