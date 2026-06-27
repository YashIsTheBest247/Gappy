/**
 * Data layer — thin wrappers over the real `lemma-sdk/react` hooks so pages stay clean.
 */
import {
  useRecords,
  useLiveRecords,
  useFunctionRun,
  useFiles,
  useFileSearch,
  useWorkflowStart,
  useUploadFile,
  useCurrentUser,
} from "lemma-sdk/react";
import { client, podId } from "./lemmaClient";

export type Ticket = {
  id: string; number?: number; subject: string; body_preview?: string;
  channel: string; customer_name?: string; customer_email?: string;
  status: string; priority?: string; category?: string; sentiment?: string;
  summary?: string; tags?: string[]; related_ticket_id?: string | null;
  assignee_user_id?: string | null;
  confidence?: number; sla_due_at?: string | null; first_response_at?: string | null;
  resolved_at?: string | null; created_at?: string;
};
export type Message = {
  id: string; ticket_id: string; direction: string; channel?: string;
  author?: string; body: string; created_at?: string;
};
export type Draft = {
  id: string; ticket_id: string; version: number; body: string;
  citations?: { path: string; quote?: string }[]; confidence?: number;
  status: string; review_notes?: string; created_at?: string;
};
export type TicketEvent = {
  id: string; ticket_id: string; kind: string; actor?: string; detail?: string; created_at?: string;
};
export type Quality = {
  id: string; ticket_id: string; draft_id: string; score?: number;
  verdict?: string; tone?: string; grounding?: string; issues?: string[]; suggestion?: string; created_at?: string;
};
export type Report = {
  id: string; headline?: string; body?: string; highlights?: string[]; period?: string; created_at?: string;
};
export type Csat = { id: string; ticket_id: string; rating?: number; comment?: string; created_at?: string };
export type Macro = { id: string; name: string; body: string; category?: string };
export type Snooze = { id: string; ticket_id: string; until?: string; reason?: string };

type Filter = { field: string; op: string; value?: unknown };
const byTicket = (ticketId: string): Filter[] => [{ field: "ticket_id", op: "eq", value: ticketId }];

/** Live queue of tickets, optionally filtered, newest first. */
export function useTickets(filters: Filter[] = []) {
  const { records, isLoading, liveStatus } = useLiveRecords<Ticket>({
    client, podId, tableName: "tickets", filters,
    sort: [{ field: "created_at", direction: "desc" }],
    limit: 200,
  });
  return { tickets: records ?? [], isLoading, liveStatus };
}

export function useTicket(id?: string) {
  const { records, isLoading } = useRecords<Ticket>({
    client, podId, tableName: "tickets", limit: 1,
    filters: id ? [{ field: "id", op: "eq", value: id }] : [],
    enabled: Boolean(id),
  });
  return { ticket: records?.[0] ?? null, isLoading };
}

export function useMessages(ticketId?: string) {
  const { records, isLoading } = useRecords<Message>({
    client, podId, tableName: "messages", limit: 100,
    filters: ticketId ? byTicket(ticketId) : [],
    sort: [{ field: "created_at", direction: "asc" }],
    enabled: Boolean(ticketId),
  });
  return { messages: records ?? [], isLoading };
}

export function useDrafts(ticketId?: string) {
  const { records, isLoading } = useRecords<Draft>({
    client, podId, tableName: "drafts", limit: 50,
    filters: ticketId ? byTicket(ticketId) : [],
    sort: [{ field: "version", direction: "desc" }],
    enabled: Boolean(ticketId),
  });
  return { drafts: records ?? [], isLoading };
}

export function useEvents(ticketId?: string) {
  const { records, isLoading } = useRecords<TicketEvent>({
    client, podId, tableName: "ticket_events", limit: 100,
    filters: ticketId ? byTicket(ticketId) : [],
    sort: [{ field: "created_at", direction: "desc" }],
    enabled: Boolean(ticketId),
  });
  return { events: records ?? [], isLoading };
}

/** Imperative function runner — wraps useFunctionRun's start()/isPolling/finalOutput. */
export function useFunctionRunner(functionName: string) {
  const fn = useFunctionRun({ client, podId, functionName });
  return {
    run: (data: Record<string, unknown>) => fn.start(data),
    busy: fn.isPolling,
    output: (fn.finalOutput ?? fn.output) as Record<string, unknown> | null,
    error: fn.error,
  };
}

/** Executive briefings (newest first). */
export function useReports() {
  const { records, isLoading } = useRecords<Report>({
    client, podId, tableName: "reports", limit: 10,
    sort: [{ field: "created_at", direction: "desc" }],
  });
  return { reports: records ?? [], latest: records?.[0] ?? null, isLoading };
}

/** Live stream of ticket events across the whole desk. */
export function useLiveEvents(limit = 40) {
  const { records, isLoading, liveStatus } = useLiveRecords<TicketEvent>({
    client, podId, tableName: "ticket_events", limit,
    sort: [{ field: "created_at", direction: "desc" }],
  });
  return { events: records ?? [], isLoading, liveStatus };
}

/** Runs the daily_digest workflow to generate a fresh briefing on demand. */
export function useDigestWorkflow() {
  const wf = useWorkflowStart({ client, podId, workflowName: "daily_digest", autoLoad: false, autoPoll: false });
  return { start: () => wf.start({}), starting: Boolean(wf.isStarting) };
}

/** Latest QA verdict for a ticket (from the reply-coach agent). */
export function useQuality(ticketId?: string) {
  const { records, isLoading } = useRecords<Quality>({
    client, podId, tableName: "quality", limit: 20,
    filters: ticketId ? byTicket(ticketId) : [],
    sort: [{ field: "created_at", direction: "desc" }],
    enabled: Boolean(ticketId),
  });
  return { quality: records?.[0] ?? null, isLoading };
}

/** All QA rows, for desk-wide quality metrics. */
export function useAllQuality() {
  const { records, isLoading } = useRecords<Quality>({ client, podId, tableName: "quality", limit: 500 });
  return { quality: records ?? [], isLoading };
}

/** The signed-in user (for assignment / "my tickets"). */
export function useMe() {
  const { user } = useCurrentUser({ client });
  return { me: user as any, id: (user as any)?.id as string | undefined };
}

/** Currently-snoozed ticket ids (until is in the future). */
export function useSnoozes() {
  const { records } = useLiveRecords<Snooze>({ client, podId, tableName: "snoozes", limit: 500 });
  const now = Date.now();
  const active = (records ?? []).filter((s) => s.until && new Date(s.until).getTime() > now);
  return { snoozedIds: new Set(active.map((s) => s.ticket_id)), count: active.length };
}

/** Canned reply macros. */
export function useMacros() {
  const { records } = useRecords<Macro>({ client, podId, tableName: "macros", limit: 50, sort: [{ field: "name", direction: "asc" }] });
  return { macros: records ?? [] };
}

/** CSAT for one ticket (latest). */
export function useCsat(ticketId?: string) {
  const { records } = useRecords<Csat>({
    client, podId, tableName: "csat", limit: 5,
    filters: ticketId ? byTicket(ticketId) : [],
    sort: [{ field: "created_at", direction: "desc" }],
    enabled: Boolean(ticketId),
  });
  return { csat: records?.[0] ?? null };
}
/** All CSAT rows for desk-wide metrics. */
export function useAllCsat() {
  const { records } = useRecords<Csat>({ client, podId, tableName: "csat", limit: 500 });
  return { csat: records ?? [] };
}

/** Upload an inbound document to /inbox, returns its path. */
export function useUploadDoc() {
  const up = useUploadFile({ client, podId });
  return {
    upload: async (file: Blob, name: string): Promise<string> => {
      const res: any = await up.upload(file, { directoryPath: "/inbox", name, searchEnabled: true, description: "Inbound document" });
      return (res?.path ?? res?.full_path ?? `/inbox/${name}`) as string;
    },
    busy: Boolean(up.isSubmitting),
  };
}
/** Parse an uploaded document into a ticket (multimodal intake). */
export function useParseWorkflow() {
  const wf = useWorkflowStart({ client, podId, workflowName: "parse_intake", autoLoad: false, autoPoll: false });
  return { start: (filePath: string) => wf.start({ file_path: filePath }), starting: Boolean(wf.isStarting) };
}

/** Starts the `intake` workflow (triage -> draft) for a ticket, submitting ticket_id to its entry form. */
export function useIntakeWorkflow() {
  const wf = useWorkflowStart({ client, podId, workflowName: "intake", autoLoad: false, autoPoll: false });
  return {
    start: (ticketId: string) => wf.start({ ticket_id: ticketId }),
    starting: Boolean(wf.isStarting),
  };
}

/** Starts the `write_kb` workflow — kb-writer drafts an article and publish_kb writes it to /knowledge. */
export function useWriteKbWorkflow() {
  const wf = useWorkflowStart({ client, podId, workflowName: "write_kb", autoLoad: false, autoPoll: false });
  return { start: (ticketId: string) => wf.start({ ticket_id: ticketId }), starting: Boolean(wf.isStarting) };
}

export function useKnowledgeFiles() {
  const { files, isLoading } = useFiles({ client, podId, directoryPath: "/knowledge" });
  return { files: files ?? [], isLoading };
}

export function useKnowledgeSearch(query: string) {
  const { results, isLoading } = useFileSearch({
    client, podId, query,
    minQueryLength: 2,
    scopePath: "/knowledge",
    scopeMode: "SUBTREE",
  });
  return { results: results ?? [], isLoading };
}
