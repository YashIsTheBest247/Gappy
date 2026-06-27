import React, { useState } from "react";
import { AgentThread } from "lemma-sdk/react";
import { conversationMessageText } from "lemma-sdk";
import { client, podId } from "../lib/lemmaClient";
import { Card, Btn } from "../lib/ui";

const SUGGESTIONS = [
  "What's urgent and still unanswered?",
  "How many tickets came in today?",
  "What does our refund policy say?",
];

/** Embedded read-only assistant backed by the `concierge` agent (AgentThread render-prop). */
export default function AssistantPage() {
  const [input, setInput] = useState("");

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Assistant</h1>
        <p className="page-sub">Ask about the queue or the knowledge base. Read-only — it never changes tickets.</p>
      </div>

      <Card style={{ display: "flex", flexDirection: "column", height: "62vh" }}>
        <AgentThread client={client} podId={podId} agentName="concierge">
          {(t) => {
            const send = (text: string) => { if (text.trim()) { t.sendMessage(text); setInput(""); } };
            const rows = (t.messages ?? [])
              .map((m) => ({ role: (m as any).role as string, text: conversationMessageText(m) }))
              .filter((r) => r.text && r.text.trim().length > 0);
            return (
              <>
                <div className="grid" style={{ gap: 12, flex: 1, overflowY: "auto", paddingRight: 6 }}>
                  {rows.length === 0 && (
                    <div className="wrap">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} className="btn btn-soft btn-sm" onClick={() => send(s)}>{s}</button>
                      ))}
                    </div>
                  )}
                  {rows.map((r, i) => (
                    <div key={i} style={{ display: "flex" }}>
                      <div className={`bubble ${r.role === "user" ? "me" : "them"}`}
                           style={{ marginLeft: r.role === "user" ? "auto" : 0 }}>
                        {r.text}
                      </div>
                    </div>
                  ))}
                  {t.isRunning && <div className="bubble them"><span className="spinner-dot" /></div>}
                </div>

                <form className="card-row" style={{ marginTop: 16, flexWrap: "nowrap" }}
                      onSubmit={(e) => { e.preventDefault(); send(input); }}>
                  <input className="input" value={input} onChange={(e) => setInput(e.target.value)}
                         placeholder="Ask the assistant…" />
                  <Btn type="submit" disabled={t.isRunning || !input.trim()}>Send</Btn>
                </form>
              </>
            );
          }}
        </AgentThread>
      </Card>
    </div>
  );
}
