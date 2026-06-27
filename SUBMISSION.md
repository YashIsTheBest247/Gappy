# Tend — Hackathon Submission

**Gappy AI National Hackathon · Powered by Lemma SDK**

---

## Problem statement chosen

**AI Customer Support Desk for a Startup** (Support track)

> *Small startups receive customer issues across email, forms, and Slack. Build an AI support desk that
> can triage issues, search product docs, draft replies, track ticket status, and escalate important
> cases for review.*

Sharpened to a specific user: **Maya, founder of a 6-person B2B SaaS** with no dedicated support hire,
whose support is scattered across `support@`, an in-app form, and `#support` on Slack.

## What I built & how it solves it

**Tend** is an autonomous, multi-agent support desk on the Lemma SDK. It doesn't just *record* tickets —
it does the work:

- **Triage** — an AI classifies category, priority, and sentiment, and auto-escalates urgent/angry customers.
- **Search product docs** — a draft agent answers using RAG over the company's own `/knowledge` store, **with citations** (no hallucinations).
- **Draft replies** — customer-ready, grounded, and then **graded by a second QA agent** (score + ship/revise/escalate verdict) before any human sees them.
- **Track status & SLA** — full lifecycle, audit trail, SLA timers, and a live analytics dashboard.
- **Escalate for review** — human-in-the-loop approval by default; **Autopilot** auto-sends only what the QA agent is confident in.

Two things make it stand out:

1. **It's autonomous.** A datastore schedule runs the entire triage → draft → QA pipeline the moment a
   ticket arrives from *any* channel — including a **live Telegram bot** a customer can message directly.
2. **It improves itself.** When the AI isn't confident, Tend flags a *knowledge gap* and an agent
   **writes a new KB article** and publishes it back into the RAG store — so the next identical question
   answers automatically.

## How to try it

- **Hosted app:** https://console.apps.lemma.work *(hosted on lemma.work; pod access shared with `ayush@gappy.ai`)*
- **Live Telegram bot:** **[@tend_support_bot](https://t.me/tend_support_bot)** — DM it a support question (e.g. *"I was charged twice, can I get a refund?"*). It answers from the knowledge base, and the ticket appears in Tend within ~30s, already triaged, drafted, and QA-graded.
- **90-second demo path:**
  1. **Create a ticket** (the "+ New ticket" form, or text the live Telegram bot) — it appears already
     triaged, drafted, and QA-scored, with **no human trigger**.
  2. Open the ticket → see the **doc-grounded draft with citations** and the **AI quality check** panel.
  3. **Insights → Knowledge Gaps** → click **"Write KB article"** → see the new doc appear under **Knowledge**.
  4. **Review → Autopilot** → ship-rated replies auto-send.
  5. Press **⌘K** to search/navigate anywhere.

## Lemma SDK usage

Tend uses essentially the entire platform: **5 tables**, **Files + RAG**, **6 agents**, **7 functions**,
**3 workflows**, a **datastore schedule** (the autonomy), a **Telegram surface**, and a **deployed app**.
Architecture detail in [ARCHITECTURE.md](ARCHITECTURE.md); setup in [README.md](README.md).



## Team

- Yash Munshi — *solo build*

