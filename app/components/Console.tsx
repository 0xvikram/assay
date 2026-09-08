"use client";
import { useState } from "react";

type Preview = { agent: string; verdict: string; confidence: number; provenance: { deployment: string; block: number }; full: string };
type Report = {
  agent: { id: string; name: string | null; owner: string };
  assessment: { verdict: string; confidence: number; headline: string; findings: { code: string; severity: string; statement: string; measured: string }[]; nextSteps: string[] };
  provenance: { chain: string; deployment: string; block: number; blockTime: string | null; sampleCap: number; sampleTruncated: boolean; latencyMs: number };
};

const COLOR: Record<string, string> = { VERIFIED: "#1F6F4A", UNPROVEN: "#A9772A", WASH_REPUTATION_DETECTED: "#9B2C2C" };
const MARK: Record<string, string> = { critical: "✗", warning: "!", info: "·" };

/**
 * The free preview runs on this page; the full report is what the 402 is for.
 * Showing the paid response here would need a wallet in the browser, and the
 * point of the product is that an agent pays, not a person clicking.
 */
export default function Console() {
  const [ref, setRef] = useState("base:25975");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [paidStatus, setPaidStatus] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const [chain, agentId] = ref.trim().split(":");
    if (!chain || !agentId) { setError('Use chain:agentId, e.g. base:25975'); return; }
    setBusy(true); setError(null); setPreview(null); setReport(null); setPaidStatus(null);
    try {
      const p = await fetch(`/api/v1/preview/${chain}/${agentId}`);
      if (!p.ok) throw new Error((await p.json()).error ?? `HTTP ${p.status}`);
      setPreview(await p.json());
      const f = await fetch(`/api/v1/agents/${chain}/${agentId}`);
      if (f.status === 402) {
        const req = f.headers.get("payment-required");
        const accepts = req ? (JSON.parse(atob(req)).accepts as { network: string; amount: string; asset: string }[]) : [];
        setPaidStatus(`402 Payment Required — ${accepts.map((a) => `${a.amount} of ${a.asset} on ${a.network}`).join(", ") || "x402"}. The full report is sold to agents, not clicked.`);
      } else if (f.ok) {
        setReport(await f.json());
      } else {
        setPaidStatus(`full report: HTTP ${f.status}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <form onSubmit={(e) => { e.preventDefault(); void run(); }} style={{ display: "flex", gap: 8, marginTop: "1.5rem" }}>
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="chain:agentId" aria-label="chain:agentId"
          style={{ flex: 1, padding: "0.6rem 0.8rem", font: "inherit", border: "1px solid #0F2226", borderRadius: 6, background: "#fff", color: "#0F2226" }} />
        <button disabled={busy} style={{ padding: "0.6rem 1rem", font: "inherit", fontWeight: 700, border: "1px solid #0F2226", borderRadius: 6, background: busy ? "#ccc" : "#0F2226", color: "#EFEFEA", cursor: busy ? "wait" : "pointer" }}>
          {busy ? "reading…" : "assay"}
        </button>
      </form>
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: "0.85rem", opacity: 0.75 }}>
        {["base:25975", "ethereum:14645", "ethereum:6888"].map((r) => (
          <button key={r} type="button" onClick={() => setRef(r)} style={{ font: "inherit", background: "none", border: "none", padding: 0, color: "#0F2226", textDecoration: "underline", cursor: "pointer" }}>{r}</button>
        ))}
      </div>

      {error && <p style={{ color: "#9B2C2C", marginTop: "1rem" }}>refused: {error}</p>}

      {preview && (
        <div style={{ marginTop: "1.5rem", padding: "1rem 1.2rem", border: "1px solid #0F2226", borderRadius: 8, background: "#fff" }}>
          <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>free preview · {preview.agent}</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: COLOR[preview.verdict] ?? "#0F2226", marginTop: 4 }}>{preview.verdict}</div>
          <div style={{ opacity: 0.8 }}>confidence {preview.confidence}/100</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: 8 }}>deployment {preview.provenance.deployment} · block {preview.provenance.block}</div>
        </div>
      )}

      {paidStatus && <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#A9772A" }}>{paidStatus}</p>}

      {report && (
        <div style={{ marginTop: "1rem", padding: "1rem 1.2rem", border: "1px solid #0F2226", borderRadius: 8, background: "#fff" }}>
          <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>full report · {report.agent.name ?? "(unnamed)"} · owner {report.agent.owner}</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: COLOR[report.assessment.verdict] ?? "#0F2226", marginTop: 4 }}>{report.assessment.verdict}</div>
          <div>{report.assessment.headline}</div>
          <ul style={{ paddingLeft: 0, listStyle: "none", marginTop: 12 }}>
            {report.assessment.findings.map((f) => (
              <li key={f.code} style={{ marginBottom: 8 }}>
                <span style={{ color: f.severity === "critical" ? "#9B2C2C" : f.severity === "warning" ? "#A9772A" : "#0F2226" }}>{MARK[f.severity]}</span> {f.statement}
                <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{f.measured}</div>
              </li>
            ))}
          </ul>
          {report.assessment.nextSteps.length > 0 && (
            <>
              <div style={{ fontWeight: 700, marginTop: 12 }}>to reach VERIFIED</div>
              <ul style={{ paddingLeft: "1.2rem" }}>{report.assessment.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>
            </>
          )}
          <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: 12 }}>
            {report.provenance.chain} · deployment {report.provenance.deployment} · block {report.provenance.block}{report.provenance.sampleTruncated ? ` · sample capped at ${report.provenance.sampleCap}` : ""} · {report.provenance.latencyMs} ms
          </div>
        </div>
      )}
    </section>
  );
}
