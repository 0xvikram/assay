"use client";
import { useState } from "react";

type Preview = { agent: string; verdict: string; confidence: number; provenance: { deployment: string; block: number }; full: string };
type Report = {
  agent: { id: string; name: string | null; owner: string };
  assessment: { verdict: string; confidence: number; headline: string; findings: { code: string; severity: string; statement: string; measured: string }[]; nextSteps: string[] };
  provenance: { chain: string; deployment: string; block: number; sampleCap: number; sampleTruncated: boolean; latencyMs: number };
};

const COLOR: Record<string, string> = { VERIFIED: "var(--mint)", UNPROVEN: "var(--gold)", WASH_REPUTATION_DETECTED: "var(--coral)" };
const MARK: Record<string, string> = { critical: "✗", warning: "!", info: "·" };
const MARK_COLOR: Record<string, string> = { critical: "var(--coral)", warning: "var(--gold)", info: "var(--ink-4)" };

/**
 * The free preview runs here; the full report is what the 402 is for. Showing
 * a paid response would need a wallet in the browser, and the point of the
 * product is that an agent pays, not a person clicking — so the card shows
 * the 402 and what it asks for, honestly.
 */
export default function Console() {
  const [ref, setRef] = useState("base:25975");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [accepts, setAccepts] = useState<{ network: string; amount: string; asset: string }[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const [chain, agentId] = ref.trim().split(":");
    if (!chain || !agentId) { setError("Use chain:agentId, e.g. base:25975"); return; }
    setBusy(true); setError(null); setPreview(null); setReport(null); setAccepts(null);
    try {
      const p = await fetch(`/api/v1/preview/${chain}/${agentId}`);
      if (!p.ok) throw new Error((await p.json()).error ?? `HTTP ${p.status}`);
      setPreview(await p.json());
      const f = await fetch(`/api/v1/agents/${chain}/${agentId}`);
      if (f.status === 402) {
        const req = f.headers.get("payment-required");
        setAccepts(req ? (JSON.parse(atob(req)).accepts as { network: string; amount: string; asset: string }[]) : []);
      } else if (f.ok) {
        setReport(await f.json());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass" style={{ display: "flex", flexDirection: "column", gap: 18, padding: "clamp(18px, 2.2vw, 30px)", boxShadow: "0 40px 90px rgba(0,0,60,0.45)", minWidth: 0 }}>
      <div className="eyebrow" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: "0.12em" }}>
        <span>Console</span><span>live · The Graph</span>
      </div>
      <form className="console-form" onSubmit={(e) => { e.preventDefault(); void run(); }}>
        <input className="input mono" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="chain:agentId" aria-label="chain:agentId" />
        <button className="btn" disabled={busy}>{busy ? "reading…" : "assay"}</button>
      </form>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["base:25975", "ethereum:14645", "ethereum:6888", "base-sepolia:9200"].map((r) => (
          <button key={r} type="button" className="chip" onClick={() => setRef(r)}>{r}</button>
        ))}
      </div>

      {error && <div style={{ color: "var(--coral)", fontSize: 14 }}>refused: {error}</div>}

      {preview && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "none" }}>free preview · {preview.agent}</div>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", color: COLOR[preview.verdict] ?? "var(--ink)" }}>{preview.verdict}</div>
          <div style={{ fontSize: 14, fontWeight: 300, color: "var(--ink-2)" }}>confidence {preview.confidence}/100</div>
          <div className="mono" style={{ fontSize: 11, lineHeight: 1.6, color: "var(--ink-4)" }}>deployment {preview.provenance.deployment} · block {preview.provenance.block}</div>
        </div>
      )}

      {accepts && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em" }}>Full report · 402 Payment Required</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 300, color: "var(--ink-2)" }}>The evidence, the next steps and the provenance are sold to agents over x402. This 402 accepts:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {accepts.map((a) => (
              <div key={a.network} className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)" }}>
                <span>{a.network}</span><span style={{ color: "var(--gold)" }}>{a.amount} · {a.asset.slice(0, 10)}{a.asset.length > 10 ? "…" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "none" }}>full report · {report.agent.name ?? "(unnamed)"}</div>
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", color: COLOR[report.assessment.verdict] ?? "var(--ink)" }}>{report.assessment.verdict}</div>
          <div style={{ fontSize: 15, fontWeight: 300, color: "var(--ink-2)" }}>{report.assessment.headline}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            {report.assessment.findings.map((f) => (
              <div key={f.code} style={{ display: "flex", gap: 12, fontSize: 14, fontWeight: 300 }}>
                <span className="mono" style={{ color: MARK_COLOR[f.severity] }}>{MARK[f.severity]}</span>
                <span>{f.statement} <span style={{ color: "var(--ink-4)" }}>— {f.measured}</span></span>
              </div>
            ))}
          </div>
          {report.assessment.nextSteps.length > 0 && (
            <div style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em" }}>To reach VERIFIED</div>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 14, lineHeight: 1.5, fontWeight: 300 }}>{report.assessment.nextSteps.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}
          <div className="mono" style={{ fontSize: 11, lineHeight: 1.6, color: "var(--ink-4)" }}>
            {report.provenance.chain} · deployment {report.provenance.deployment} · block {report.provenance.block}{report.provenance.sampleTruncated ? ` · sample capped at ${report.provenance.sampleCap}` : ""} · {report.provenance.latencyMs} ms
          </div>
        </div>
      )}
    </div>
  );
}
