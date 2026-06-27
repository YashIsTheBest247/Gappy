# Tend — Architecture

Tend is a single **Lemma pod** (`support-desk`). This document describes the data model, the
agents, the autonomous pipeline, the channels, and the design decisions behind it.

At a glance: **9 tables · 8 agents · 17 functions · 9 workflows · 6 schedules · 1 live surface · a deployed app.**

---

## 1. Data model (Tables)

All tables are **shared** (`enable_rls: false`) — it's a team queue, not per-user data. Relationships
are by `*_id` convention (foreign keys were intentionally dropped; see §6).

| Table | Key columns |
|---|---|
| **tickets** | `number` (serial), `subject`, `body_preview`, `channel`, `customer_name/email`, `status`(new→triaged→awaiting_approval→answered / escalated / closed), `priority`, `category`, `sentiment`, `summary`, `tags`(json), `assignee_user_id`, `related_ticket_id`(dedupe link), `confidence`(float), `sla_due_at`, `first_response_at`, `resolved_at` |
| **messages** | `ticket_id`, `direction`(inbound/outbound/internal), `channel`, `author`, `body` |
| **drafts** | `ticket_id`, `version`, `body`, `citations`(json), `confidence`, `status`(proposed/approved/rejected/sent), `reviewer_user_id`, `review_notes` |
| **ticket_events** | `ticket_id`, `kind`, `actor`, `detail` — the audit trail and live activity feed |
| **quality** | `ticket_id`, `draft_id`, `score`(0-100), `verdict`(ship/revise/escalate), `tone`, `grounding`, `issues`(json), `suggestion` — the QA verdict |
| **reports** | `headline`, `body`, `highlights`(json), `period` — generated executive briefings |
| **csat** | `ticket_id`, `rating`(1-5), `comment` — customer satisfaction |
| **macros** | `name`, `body`, `category` — canned reply snippets |
| **snoozes** | `ticket_id`, `until`(datetime), `reason` — active snoozes; cleared by the `unsnooze` cron |

**Files / RAG:**
- `/knowledge` — product docs (`.txt`), auto-indexed. The draft, coach, and concierge agents search it; the **kb-writer** publishes new docs into it (self-improving).
- `/inbox` — uploaded documents (PDF/email/screenshot) for multimodal intake.

---

## 2. Agents (8)

Agents are pure reasoners — they read context and emit structured output; **functions** do all the
writes. Each has an `instruction.txt` and a JSON-Schema `output_schema`.

| Agent | Role | Reads | Output |
|---|---|---|---|
| **triage-agent** | Classify a ticket | tickets, messages | category, priority, sentiment, summary, tags |
| **draft-agent** | Write a grounded reply | tickets, messages, `/knowledge` | body, citations[], confidence, needs_human |
| **reply-coach** | QA the draft (second opinion) | tickets, messages, drafts, `/knowledge` | score, verdict, tone, grounding, issues[], suggestion |
| **kb-writer** | Turn an unanswered ticket into a KB article | tickets, messages, `/knowledge` | title, slug, body |
| **frontline** | Customer-facing chat agent (Telegram) | `/knowledge` + `intake_ticket` tool | answers customers + logs a ticket |
| **concierge** | Read-only team assistant in the app | all tables, `/knowledge` | answers about the queue/KB |
| **digest** | Write an executive briefing of the desk | tickets, quality, ticket_events | headline, body, highlights[] |
| **intake-parser** | Extract a ticket from an uploaded document | `/inbox` | subject, body, customer_name/email, channel |

---

## 3. Functions (17)

Deterministic Python (`code.py`, Pydantic in/out). Functions own every table write and side effect.

| Function | Does |
|---|---|
| **intake_ticket** | Create the ticket + first inbound message + `created` event |
| **apply_triage** | Persist triage; recompute SLA from priority; auto-escalate urgent / high+negative |
| **save_draft** | Store a new draft version; move ticket → `awaiting_approval` (preserving `escalated`) |
| **decide_reply** | Human/Autopilot decision: approve → outbound message + `answered` + SLA close; reject → back to queue |
| **escalate_ticket** | Mark a ticket escalated with a reason |
| **save_quality** | Persist the reply-coach verdict into `quality` + a note event |
| **publish_kb** | Write a generated article into `/knowledge` (RAG-indexed) + a note event |
| **save_digest** | Persist a generated briefing into `reports` |
| **sla_sweep** | Escalate every open ticket past its SLA (run on a cron) |
| **record_csat** | Store a 1-5 customer rating into `csat` + a note event |
| **assign_ticket** | Assign / unassign a ticket to a pod member + a note event |
| **set_tags** | Replace a ticket's tags (inline tag editor) |
| **snooze_ticket** | Snooze a ticket until a chosen time (writes a `snoozes` row) + a note event |
| **unsnooze_sweep** | Delete elapsed snooze rows so tickets resurface (run on a cron) |
| **followup_sweep** | Find answered-but-silent tickets, draft a check-in, move them back to Review (cron) |
| **churn_sweep** | Detect at-risk customers and open a proactive retention ticket with a drafted outreach (cron) |
| **merge_tickets** | Merge a duplicate into a primary: move its messages, close it, link both sides |

---

## 4. Workflows (9) & Schedules (6)

### Workflows
| Workflow | Shape | Trigger |
|---|---|---|
| **auto_intake** | triage → apply_triage → draft → save_draft → reply-coach → save_quality → END | the `auto-intake` datastore schedule |
| **intake** | same chain, with a `FORM(ticket_id)` entry | app "Run AI" (`useWorkflowStart`) |
| **write_kb** | `FORM(ticket_id)` → kb-writer → publish_kb → END | app "Write KB article" |
| **daily_digest** | digest → save_digest → END | `daily-briefing` cron + app "Generate now" |
| **sla_sweep** | sla_sweep → END | `sla-sweep` cron |
| **parse_intake** | `FORM(file_path)` → intake-parser → intake_ticket → END | app document upload |
| **unsnooze_sweep** | unsnooze_sweep → END | `unsnooze` cron |
| **followup_sweep** | followup_sweep → END | `followup` cron |
| **churn_sweep** | churn_sweep → END | `churn` cron |

### Schedules — the autonomy
| Schedule | Type | Fires |
|---|---|---|
| **auto-intake** | DATASTORE (`tickets` INSERT) | runs `auto_intake` the instant any ticket is created (reads `start.metadata.record_id`) |
| **daily-briefing** | TIME cron `0 9 * * *` | writes the executive briefing every morning |
| **sla-sweep** | TIME cron `*/30 * * * *` | enforces SLAs every 30 minutes |
| **unsnooze** | TIME cron `*/15 * * * *` | clears elapsed snoozes so tickets resurface |
| **followup** | TIME cron `0 10 * * *` | drafts follow-ups for answered-but-silent tickets |
| **churn** | TIME cron `0 8 * * *` | opens proactive retention tickets for at-risk customers |

This is what makes the desk **autonomous**: a ticket from *any* source (app, the Telegram agent, the
document parser, or a raw insert) triggers the full triage → draft → QA pipeline with no human in the
loop until approval.

### Channels & the Surface
The **`frontline`** agent is bound to a live **Telegram surface** ([@tend_support_bot](https://t.me/tend_support_bot)).
An inbound DM → the agent answers from `/knowledge` and calls `intake_ticket` (a granted function tool)
→ the new row triggers `auto-intake`. Email / form / Slack feed the same `intake_ticket` entry point;
documents feed `parse_intake`.

---

## 5. The app (`apps/console`)

Vite + React + TypeScript on the `lemma-sdk` React hooks. All pod access is centralized in
`src/lib/podData.ts`; the client is constructed once in `src/lib/lemmaClient.ts` from the pod config
Lemma injects at deploy time. **9 pages:**

- **Queue** — live, filterable, searchable list (`useLiveRecords`); SLA badges; **bulk** select → escalate / re-run AI; **"Mine"** filter
- **Review** — drafts awaiting approval with QA scores + **⚡ Autopilot** (bulk-approve ship-rated)
- **Ticket** — conversation, editable draft + **macros** + citations, **AI quality check**, **CSAT**, **assign to me**, similar tickets, activity timeline, Run-AI / Write-KB / Escalate
- **Insights** — KPIs (incl. avg QA, ship-rate, avg CSAT), **AI-performance**, automation & channels, breakdown bars, **Knowledge Gaps**
- **Customers** — CRM: tickets grouped by person, history, repeat / at-risk flags
- **Briefing** — the AI executive summary + a **live activity feed**
- **Knowledge** — the `/knowledge` docs + semantic search
- **Assistant** — the read-only `concierge` agent (`AgentThread`)
- **New ticket** — manual form **or** drop a PDF/email/screenshot (multimodal)

Plus a **⌘K command palette**, dark mode (flash-free), toasts, and page transitions.

---

## 6. Notable design decisions

- **Agents reason, functions write.** Agent and function runtime identities/grants differ; keeping all
  writes in functions (which reliably get grants) made the system robust. Agents emit structured output
  that functions persist.
- **Agents can call functions as tools.** The `frontline` agent logs tickets by calling `intake_ticket`
  (granted `function.read/execute`, with the function's table grants mirrored onto the agent).
- **Two AIs, not one.** The reply-coach is a separate agent, so quality control is independent of the
  drafter — a real second opinion, surfaced as a score the human (and Autopilot) can trust.
- **Autonomy via schedules, not a workflow's own trigger.** A workflow's built-in `DATASTORE_EVENT`
  start does not fire on this platform; a `schedules`-based datastore trigger does. `auto_intake` reads
  `start.metadata.record_id`. Time crons drive the briefing and SLA sweep.
- **No foreign keys.** The platform 500s on self-referential FKs and creates tables alphabetically (so
  child→parent FKs fail). Relating by `*_id` UUID convention is order-independent and loses nothing.
- **Grants applied server-side.** Bundle import doesn't apply `permissions.grants`; they're pushed with
  `lemma {agents,functions} permissions replace` (payloads in [`grants/`](grants/)). Re-importing wipes
  them — reapply.
- **Self-improving loop.** Low draft confidence → a *knowledge gap* → `write_kb` publishes a doc → future
  drafts ground in it. The product gets measurably better the more it's used.
- **Surfaces are authenticated chat.** Lemma maps a surface sender to a delegated pod user, so a chatter
  links once (Telegram username on the profile) — there is no anonymous/guest mode.
