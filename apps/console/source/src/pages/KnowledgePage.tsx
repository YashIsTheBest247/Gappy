import React, { useState } from "react";
import { useKnowledgeFiles, useKnowledgeSearch } from "../lib/podData";
import { Card, Badge, Loading, Empty } from "../lib/ui";

export default function KnowledgePage() {
  const { files, isLoading } = useKnowledgeFiles();
  const [query, setQuery] = useState("");
  const { results, isLoading: searching } = useKnowledgeSearch(query);

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Knowledge</h1>
        <p className="page-sub">The same docs the draft agent searches to ground every reply.</p>
      </div>

      <Card className="compact" style={{ marginBottom: 20 }}>
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)}
               placeholder="Search the knowledge base… e.g. refund window, SSO, CSV export" />
        {query.trim().length > 1 && (
          <div className="grid" style={{ gap: 8, marginTop: 14 }}>
            {searching ? <Loading label="Searching" /> :
              results.length === 0 ? <Empty>No matches.</Empty> :
              results.map((r: any, i: number) => (
                <div key={i} className="card muted compact" style={{ padding: "12px 16px", borderRadius: 16 }}>
                  <Badge variant="outline">{r.path ?? r.file_path ?? "doc"}</Badge>
                  <p className="muted-text" style={{ margin: "8px 0 0", fontSize: 13 }}>
                    {r.snippet ?? r.text ?? r.content ?? ""}
                  </p>
                </div>
              ))}
          </div>
        )}
      </Card>

      <h3 style={{ fontSize: 18, marginBottom: 14 }}>Documents</h3>
      {isLoading ? <Loading label="Loading docs" /> :
        files.length === 0 ? <Card><Empty>No docs yet. The seed script uploads the starter KB to /knowledge.</Empty></Card> :
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {files.map((f: any, i: number) => (
            <Card key={i} className="compact">
              <div className="brand-mark" style={{ borderRadius: 14, marginBottom: 12 }}>≡</div>
              <strong>{(f.name ?? f.path ?? "Document").replace(/^.*\//, "")}</strong>
              {f.description && <p className="muted-text" style={{ margin: "6px 0 0", fontSize: 13 }}>{f.description}</p>}
            </Card>
          ))}
        </div>}
    </div>
  );
}
