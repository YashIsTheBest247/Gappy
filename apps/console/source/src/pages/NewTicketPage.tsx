import React, { useState } from "react";
import { useFunctionRunner } from "../lib/podData";
import { Card, Btn, Field } from "../lib/ui";
import { go } from "../lib/router";

const SAMPLES = [
  { label: "Refund", subject: "Charged twice this month",
    body: "I see two identical charges for the Growth plan this month. Can you refund the duplicate?" },
  { label: "SSO how-to", subject: "Setting up Google SSO",
    body: "We're on Scale and want Google Workspace SSO without locking ourselves out. How?" },
  { label: "Urgent outage", subject: "URGENT: dashboards down for our whole team",
    body: "Nothing loads since this morning, the whole team is blocked. Considering cancelling." },
];

export default function NewTicketPage() {
  const intake = useFunctionRunner("intake_ticket");
  const [form, setForm] = useState({
    subject: "", body: "", channel: "email", customer_name: "", customer_email: "",
  });
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.subject.trim() || !form.body.trim()) {
      alert("Subject and message are required.");
      return;
    }
    const res: any = await intake.run(form);
    const out = res?.output_data ?? res?.output ?? res;
    const id = out?.ticket_id;
    go(id ? `#/ticket/${id}` : "#/queue");
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">New ticket</h1>
        <p className="page-sub">Simulate an inbound message. Triage and a grounded draft run automatically.</p>
      </div>

      <div className="split">
        <Card>
          <Field label="Subject"><input className="input" value={form.subject} onChange={set("subject")} placeholder="What's the issue?" /></Field>
          <Field label="Message">
            <textarea className="textarea" value={form.body} onChange={set("body")} placeholder="Paste the customer's message…" />
          </Field>
          <div className="card-row">
            <div style={{ flex: 1 }}>
              <Field label="Channel">
                <select className="select" value={form.channel} onChange={set("channel")}>
                  <option value="email">Email</option>
                  <option value="form">In-app form</option>
                  <option value="slack">Slack</option>
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Customer name"><input className="input" value={form.customer_name} onChange={set("customer_name")} /></Field>
            </div>
          </div>
          <Field label="Customer email"><input className="input" value={form.customer_email} onChange={set("customer_email")} placeholder="name@company.com" /></Field>
          <Btn onClick={submit} disabled={intake.busy}>{intake.busy ? "Creating…" : "Create ticket"}</Btn>
        </Card>

        <Card className="muted compact">
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>Quick samples</h3>
          <div className="grid" style={{ gap: 10 }}>
            {SAMPLES.map((s) => (
              <button key={s.label} className="btn btn-soft" style={{ justifyContent: "flex-start" }}
                onClick={() => setForm({ ...form, subject: s.subject, body: s.body })}>
                {s.label} — {s.subject}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
