#!/usr/bin/env bash
# Seed the AI Support Desk pod with knowledge docs and realistic inbound tickets.
# Run from the pod root:  bash seed/seed.sh
# Requires: the pod already imported (lemma pods import .) and an LLM key configured.
#
# NOTE: file/CLI flag names below follow the documented commands; if your lemma version
# differs, run `lemma files --help` / `lemma functions --help` and adjust the two helpers.
set -euo pipefail

# 1) Upload the knowledge base so the draft agent can ground replies (RAG over /knowledge).
upload_kb () {
  local f="$1"
  echo "Uploading $f -> /knowledge"
  lemma files upload "knowledge/$f" --path /knowledge --description "Support KB: $f"
}
upload_kb "billing-and-refunds.txt"
upload_kb "accounts-and-login.txt"
upload_kb "data-export-and-api.txt"
upload_kb "troubleshooting-and-status.txt"

# 2) Fire inbound tickets. intake_ticket creates the ticket; the intake workflow
#    auto-triggers on the new row (triage -> draft -> awaiting_approval).
new_ticket () {
  echo "Creating ticket: $1"
  lemma functions run intake_ticket --data "$2"
  sleep 1
}

new_ticket "Refund for duplicate charge" '{
  "subject": "I was charged twice this month",
  "body": "Hi, I just noticed two identical charges on my card for the Growth plan this month. Can you refund the duplicate? This is a bit worrying.",
  "channel": "email",
  "customer_name": "Priya Nair",
  "customer_email": "priya@northwind.io"
}'

new_ticket "How to set up SSO" '{
  "subject": "Setting up Google SSO for our team",
  "body": "We are on the Scale plan and want to roll out Google Workspace SSO. How do we set it up without locking ourselves out?",
  "channel": "form",
  "customer_name": "Marco Reyes",
  "customer_email": "marco@brightlabs.dev"
}'

new_ticket "CSV export failing" '{
  "subject": "Large CSV export keeps failing",
  "body": "Every time I export our main dashboard (it has a lot of columns) the browser just spins and nothing downloads. We need this data for a board meeting tomorrow.",
  "channel": "slack",
  "customer_name": "Dana Kim",
  "customer_email": "dana@acme-analytics.com"
}'

new_ticket "Everything is down" '{
  "subject": "URGENT: dashboards completely down for our whole team",
  "body": "None of our dashboards load at all since this morning. The whole team is blocked and customers are asking us for numbers. This is unacceptable, we are seriously considering cancelling.",
  "channel": "email",
  "customer_name": "Sam Okafor",
  "customer_email": "sam@ledgerly.co"
}'

echo "Seed complete. Open the console app and check the Review queue."
