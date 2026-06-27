<div align="center">

# Tend — AI Support Desk

**An autonomous, multi-agent customer-support desk built on the Lemma SDK.**

Every ticket — from email, an in-app form, Slack, or a live Telegram bot — is auto-triaged,
answered from your own docs, quality-checked by a second AI, and routed to a human (or Autopilot) for approval.
And it writes its own documentation to get smarter over time.

[Live app → console.apps.lemma.work](https://console.apps.lemma.work) · [Live Telegram bot → @tend_support_bot](https://t.me/tend_support_bot)

Built for the **Gappy AI National Hackathon** · Problem statement: **AI Customer Support Desk for a Startup**

</div>

---

## The problem

> *Maya runs a 6-person B2B SaaS. Support lands in three places — a shared `support@` inbox, an in-app form, and a `#support` Slack channel — and there's no dedicated support hire.* Tickets slip through the cracks, replies are slow, and answers are inconsistent because the product docs live in four different places.

Small startups can't staff a support team, but bad support churns customers. They need something that **does the work**, not just another inbox.

## What Tend does

Tend turns that mess into a calm, self-running operation:

1. **Captures** a request from any channel (email / form / Slack / live Telegram bot).
2. **Triages** it — an AI sets category, priority, sentiment, and auto-escalates urgent/angry customers.
3. **Drafts** a reply **grounded in your knowledge base** (RAG), with citations — never a hallucinated answer.
4. **Quality-checks** every draft with a *second* AI ("Reply Coach") that scores it 0–100 and gives a **ship / revise / escalate** verdict.
5. **Human approves** (one click) — or **Autopilot** auto-sends everything the QA agent rated *ship*.
6. **Closes the loop**: when the AI wasn't confident, Tend flags a *knowledge gap* and can **write a new KB article itself** — so the next identical question answers automatically.

All of step 2–4 happens **autonomously the moment a ticket arrives** — no human trigger.

---

## Features

**Multi-agent core**
- **Triage agent** — category, priority, sentiment, tags, auto-escalation
- **Draft agent** — doc-grounded replies with real citations (RAG over your `/knowledge` store)
- **Reply-Coach QA agent** — a second, independent AI grades every draft (0–100 score, ship / revise / escalate verdict, tone, grounding, issues, suggestion)
- **Human-in-the-loop approval** with inline editing, canned-reply macros, and "send back for re-draft"

**Autonomy**
- **Fully autonomous pipeline** — a datastore schedule runs triage → draft → QA the instant any ticket arrives, from any source, with no human trigger
- **Autopilot** — one click auto-sends every draft the QA agent rated *ship* (≥90); humans only handle the rest
- **SLA auto-escalation** — a cron job escalates any open ticket past its SLA
- **Daily Briefing** — a `digest` agent writes an executive summary of the whole desk, on a 9 am cron and on-demand, alongside a live activity feed

**Channels & intake**
- **Live Telegram agent** ([@tend_support_bot](https://t.me/tend_support_bot)) — a customer-facing agent answers from your docs and logs tickets straight into the desk
- **Multimodal intake** — drop a PDF, email, or screenshot on the New Ticket form; the `intake-parser` agent extracts a clean ticket from it
- Email, in-app form, and Slack all feed the same pipeline

**Intelligence**
- **Insights dashboard** — resolution rate, first-response time, SLA-at-risk, avg AI confidence, avg QA score, ship-rate, avg CSAT, AI-performance throughput, and breakdowns by category / priority / sentiment / status
- **Knowledge Gaps** — surfaces low-confidence topics so you know which docs to write
- **Self-improving knowledge base** — the `kb-writer` agent drafts a new article from an unanswered ticket and publishes it back into the RAG store, so the next identical question answers itself
- **Customers (CRM)** — every ticket grouped by person, with history, repeat-contact and at-risk flags
- **CSAT** — capture a 1–5 customer rating per ticket; surfaced on Insights
- **Similar tickets** + **SLA tracking** with at-risk highlighting

**Operator UX**
- **⌘K command palette** — search tickets, navigate, run actions
- **Bulk actions** — multi-select tickets to escalate or re-run the AI
- **Assignment** — assign tickets to yourself, plus a "Mine" queue filter
- **Concierge assistant** — a read-only AI you can ask about the queue or docs
- Dark mode (flash-free), fully responsive, smooth transitions, `prefers-reduced-motion` aware, soft pastel design system with a custom logo

---

## Architecture (at a glance)

Tend is a single **Lemma pod** — `support-desk` — that uses essentially the entire Lemma platform:

```
                        ┌─────────────── CHANNELS ───────────────┐
            Email ·  In-app form ·  Slack  ·   Telegram (frontline agent / Surface)
                        └───────────────────┬────────────────────┘
                                            │ creates a ticket row
                                            ▼
                       ┌──────────  Tables (datastore)  ──────────┐
                       │ tickets · messages · drafts · ticket_events · quality
                       └───────────────────┬──────────────────────┘
                          insert fires a DATASTORE schedule ⏱
                                            ▼
            ┌──────────────  auto_intake workflow (autonomous)  ──────────────┐
            │  triage-agent → apply_triage → draft-agent → save_draft         │
            │       → reply-coach (QA) → save_quality → END                   │
            └───────────────────┬─────────────────────────────────────────────┘
                                ▼
                  Review queue → human approves /  Autopilot → decide_reply
                                ▼
                  answered · outbound message · SLA closed
                                │
        low confidence? ───────►  Knowledge Gaps → write_kb workflow
                                   (kb-writer → publish_kb → /knowledge, RAG-indexed)
```

| Lemma primitive | Used for |
|---|---|
| **Tables** (8) | `tickets`, `messages`, `drafts`, `ticket_events`, `quality`, `reports`, `csat`, `macros` |
| **Files / RAG** | `/knowledge` (self-improving doc store the agents ground in) + `/inbox` (multimodal uploads) |
| **Agents** (8) | `triage-agent`, `draft-agent`, `reply-coach`, `kb-writer`, `frontline`, `concierge`, `digest`, `intake-parser` |
| **Functions** (11) | `intake_ticket`, `apply_triage`, `save_draft`, `decide_reply`, `escalate_ticket`, `save_quality`, `publish_kb`, `save_digest`, `sla_sweep`, `record_csat`, `assign_ticket` |
| **Workflows** (6) | `intake`, `auto_intake`, `write_kb`, `daily_digest`, `sla_sweep`, `parse_intake` |
| **Schedules** (3) | a DATASTORE trigger (`auto-intake`, the autonomy) + two TIME crons (`daily-briefing` 9 am, `sla-sweep` every 30 min) |
| **Surface** | live **Telegram** bot ([@tend_support_bot](https://t.me/tend_support_bot)) bound to the `frontline` agent |
| **App** | Vite + React + `lemma-sdk` console — 9 pages (Queue, Review, Insights, Customers, Briefing, Knowledge, Assistant, New ticket, Ticket detail) |

Full detail in **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

##  Setup & run

> The Lemma CLI is Unix-only (it imports `termios`), so on Windows run everything inside **WSL**. Lemma's hosted models are used (no API key needed).

### Prerequisites
- Lemma CLI (`uv tool install lemma-terminal`) on macOS/Linux/WSL
- Node 18+ (for the app build)
- A Lemma account (the SDK launched publicly June 24, 2026)

### 1. Authenticate & target the cloud
```bash
lemma auth login            # browser flow; choose "Use Lemma" models
lemma servers cloud --use
```

### 2. Create the pod and import the backend
```bash
cd support-desk
export LEMMA_ORG_ID=<your-org-id>          # from `lemma orgs list`
lemma pods create support-desk
# import tables first (FK-free, order-independent), then functions, agents, workflows:
lemma --pod support-desk pods import .
```

### 3. Apply grants (important)
Lemma's bundle import creates agents/functions but **does not apply their `permissions.grants`** — apply them server-side from the payloads in [`grants/`](grants/):
```bash
# agents
lemma agents    permissions replace triage-agent  -f grants/triage.json
lemma agents    permissions replace draft-agent   -f grants/draft.json
lemma agents    permissions replace reply-coach   -f grants/coach.json
lemma agents    permissions replace kb-writer     -f grants/kbwriter.json
lemma agents    permissions replace concierge     -f grants/concierge.json
lemma agents    permissions replace frontline     -f grants/frontline.json
lemma agents    permissions replace digest        -f grants/digest.json
lemma agents    permissions replace intake-parser -f grants/parser.json
# functions (the data-writing functions share grants/allfn.json; specialised ones have their own)
lemma functions permissions replace intake_ticket  -f grants/allfn.json
lemma functions permissions replace apply_triage   -f grants/allfn.json
lemma functions permissions replace save_draft     -f grants/allfn.json
lemma functions permissions replace decide_reply   -f grants/allfn.json
lemma functions permissions replace escalate_ticket -f grants/allfn.json
lemma functions permissions replace save_quality   -f grants/savequality.json
lemma functions permissions replace publish_kb     -f grants/publishkb.json
lemma functions permissions replace save_digest    -f grants/savedigest.json
lemma functions permissions replace sla_sweep      -f grants/slasweep.json
lemma functions permissions replace record_csat    -f grants/recordcsat.json
lemma functions permissions replace assign_ticket  -f grants/assign.json
```
> Tip: re-importing a resource wipes its grants — reapply after any import.

### 4. Upload the knowledge base (RAG)
```bash
lemma file mkdir /knowledge
for f in knowledge/*.txt; do lemma file upload "$f" "/knowledge/$(basename "$f")"; done
```

### 5. Turn on autonomy, automations + the live channel
```bash
# multimodal uploads land in /inbox
lemma file mkdir /inbox

# autonomous pipeline: run auto_intake whenever a ticket is inserted
lemma schedules create --workflow auto_intake  --datastore tickets --on insert --name auto-intake
# daily executive briefing at 9am
lemma schedules create --workflow daily_digest --cron "0 9 * * *"   --name daily-briefing
# SLA enforcement every 30 minutes
lemma schedules create --workflow sla_sweep    --cron "*/30 * * * *" --name sla-sweep

# live Telegram agent (use a BotFather bot token via the dashboard for a public handle)
lemma surfaces upsert TELEGRAM --agent frontline --credential-mode CUSTOM --account <telegram-account-id> --enabled
lemma surfaces setup TELEGRAM
```

### 6. Deploy the app
```bash
# the build needs the pod's API/auth/pod-id — see apps/console/source/.env.local.example
lemma apps deploy console apps/console/source --yes
```

### 7. Seed a demo (optional)
```bash
bash seed/seed.sh
```

---

##  Project structure

```
support-desk/
├── pod.json
├── tables/            # tickets, messages, drafts, ticket_events, quality, reports, csat, macros
├── functions/         # *.json + code.py  (11 Python functions)
├── agents/            # *.json + instruction.txt  (8 agents)
├── workflows/         # intake, auto_intake, write_kb, daily_digest, sla_sweep, parse_intake
├── knowledge/         # .txt KB docs (RAG source)
├── grants/            # server-side permission payloads (applied after import)
├── seed/              # seed.sh + a sample inbound document
└── apps/console/source/   # Vite + React + lemma-sdk app
    └── src/
        ├── lib/        # lemmaClient, podData (hooks), router, ui, toast, CommandPalette, Logo
        └── pages/      # Queue, Review, Ticket, Insights, Customers, Briefing, Knowledge, Assistant, NewTicket
```

---

##  Tech stack

- **Backend:** Lemma SDK (pod = tables, agents, functions, workflows, schedules, surfaces, files), Python functions (Pydantic), Lemma-hosted models
- **Frontend:** Vite · React 18 · TypeScript · `lemma-sdk` React hooks · TanStack Query · DM Sans
- **Design:** custom soft-pastel system (light + dark), CSS animations, fully responsive

---

##  Submission

See **[SUBMISSION.md](SUBMISSION.md)** for the problem statement, solution summary, and demo guide.

Built with the Lemma SDK for the Gappy AI National Hackathon.
