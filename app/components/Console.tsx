"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Preview = { agent: string; verdict: string; confidence: number; headline?: string; provenance: { deployment: string; block: number }; full: string };
type Accept = { network: string; amount: string; asset: string };
type Report = {
  agent: { id: string; name: string | null; owner: string };
  assessment: { verdict: string; confidence: number; headline: string; findings: { code: string; severity: string; statement: string; measured: string }[]; nextSteps: string[] };
  provenance: { chain: string; deployment: string; block: number; sampleCap: number; sampleTruncated: boolean; latencyMs: number };
};

const COLOR: Record<string, string> = { VERIFIED: "var(--mint)", UNPROVEN: "var(--gold)", WASH_REPUTATION_DETECTED: "var(--coral)" };
const MARK: Record<string, string> = { critical: "✗", warning: "!", info: "·" };
const MARK_COLOR: Record<string, string> = { critical: "var(--coral)", warning: "var(--gold)", info: "var(--ink-4)" };
const RAIL: Record<string, string> = { "hedera:testnet": "Hedera", "eip155:5042002": "Arc", "eip155:84532": "Base Sepolia" };
const PRESETS = [
  { ref: "base:25975", note: "the farm" },
  { ref: "ethereum:14645", note: "sybil burst" },
  { ref: "ethereum:6888", note: "honest, unproven" },
  { ref: "base-sepolia:9200", note: "Assay itself" },
];
export const FIRST = PRESETS[0]!.ref;

/** What a 402 asks for, in the unit a person reads rather than the atomic unit the wire carries. */
function price(a: Accept) {
  const n = Number(a.amount);
  const f = (x: number) => x.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return a.network.startsWith("hedera") ? `${f(n / 1e8)} ℏ` : `$${f(n / 1e6)} USDC`;
}

/**
 * The free preview runs here; the full report is what the 402 is for. Showing
 * a paid response would need a wallet in the browser, and the point of the
 * product is that an agent pays, not a person clicking — so the card shows
 * the 402 and what it asks for, honestly.
 *
 * It opens already reading the farm, because an empty input shows nothing, and
 * any section on the page can ask it to run a reference via an `assay:run` event.
 */
export default function Console() {
  const [ref, setRef] = useState(FIRST);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [accepts, setAccepts] = useState<Accept[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [took, setTook] = useState<number | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  // Only the latest request may write state; a slow earlier read must not overwrite a newer one.
  const seq = useRef(0);
  const started = useRef(false);

  const run = useCallback(async (target: string) => {
    const [chain, agentId] = target.trim().split(":");
    if (!chain || !agentId) { setError("Use chain:agentId, e.g. base:25975"); return; }
    const id = ++seq.current;
    setRef(target); setBusy(true); setError(null); setPreview(null); setReport(null); setAccepts(null); setTook(null);
    const t0 = performance.now();
    try {
      // The 402 is answered before the handler runs, so both requests can go at once.
      const [p, f] = await Promise.all([
        fetch(`/api/v1/preview/${chain}/${agentId}`),
        fetch(`/api/v1/agents/${chain}/${agentId}`),
      ]);
      if (!p.ok) throw new Error((await p.json().catch(() => ({}))).error ?? `HTTP ${p.status}`);
      const pv = (await p.json()) as Preview;
      let acc: Accept[] | null = null;
      let rep: Report | null = null;
      if (f.status === 402) {
        const req = f.headers.get("payment-required");
        acc = req ? (JSON.parse(atob(req)).accepts as Accept[]) : [];
      } else if (f.ok) {
        rep = (await f.json()) as Report;
      }
      if (id !== seq.current) return;
      setPreview(pv); setAccepts(acc); setReport(rep); setTook(performance.now() - t0); setShown(target.trim());
    } catch (e) {
      if (id === seq.current) setError((e as Error).message);
    } finally {
      if (id === seq.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    // A link can name the agent to open with (/?ref=base:25975), as the agent pages do.
    if (!started.current) { started.current = true; const q = new URLSearchParams(window.location.search).get("ref"); void run(q && /^[a-z0-9-]+:\d+$/i.test(q) ? q : FIRST); }
    const onRun = (e: Event) => { const r = (e as CustomEvent<string>).detail; if (r) void run(r); };
    window.addEventListener("assay:run", onRun);
    return () => window.removeEventListener("assay:run", onRun);
  }, [run]);

  const color = preview ? COLOR[preview.verdict] ?? "var(--ink)" : "var(--ink)";

  return (
    <div className="glass" style={{ display: "flex", flexDirection: "column", gap: 18, padding: "clamp(18px, 2.2vw, 30px)", minWidth: 0 }}>
      <div className="eyebrow" style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, letterSpacing: "0.12em" }}>
        <span>Console</span><span><span className="live-dot" aria-hidden="true" />live · The Graph</span>
      </div>
      <form className="console-form" onSubmit={(e) => { e.preventDefault(); void run(ref); }}>
        <input className="input mono" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="chain:agentId" aria-label="chain:agentId" spellCheck={false} />
        <button className="btn" disabled={busy} aria-busy={busy}>{busy ? "reading…" : "assay"}</button>
      </form>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <button key={p.ref} type="button" className="chip" aria-pressed={ref === p.ref} title={p.note} onClick={() => void run(p.ref)} disabled={busy && ref === p.ref}>
            {p.ref}
          </button>
        ))}
      </div>

      <div aria-live="polite" style={{ display: "contents" }}>
        {error && <div className="fade-in" style={{ color: "var(--coral)", fontSize: 14 }}>refused: {error}</div>}

        {busy && (
          <div className="skel-stack" aria-hidden="true">
            <div className="skel" style={{ height: 11, width: "34%" }} />
            <div className="skel" style={{ height: 28, width: "76%" }} />
            <div className="skel" style={{ height: 13, width: "92%" }} />
            <div className="skel" style={{ height: 4, width: "100%" }} />
            <div className="skel" style={{ height: 11, width: "58%" }} />
          </div>
        )}

        {preview && !busy && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "none" }}>free preview · {preview.agent}</div>
            <div className="badge mono" style={{ fontSize: "clamp(17px, 1.8vw, 21px)", fontWeight: 500, color, overflowWrap: "anywhere" }}>{preview.verdict}</div>
            {preview.headline && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, fontWeight: 300, color: "var(--ink)" }}>{preview.headline}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={preview.confidence} aria-label="confidence">
                <i style={{ width: `${Math.max(preview.confidence, 0)}%`, background: color }} />
              </div>
              <div className="mono" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "2px 12px", fontSize: 11, color: "var(--ink-3)" }}>
                <span style={{ whiteSpace: "nowrap" }}>confidence {preview.confidence}/100</span>
                <span style={{ color: "var(--ink-4)" }}>earned only from payment-backed reviews</span>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 11, lineHeight: 1.6, color: "var(--ink-4)", overflowWrap: "anywhere" }}>
              deployment {preview.provenance.deployment} · block {preview.provenance.block}{took != null ? ` · read in ${(took / 1000).toFixed(1)}s` : ""}
            </div>
            {shown && <a href={`/agent/${shown.split(":")[0]}/${shown.split(":")[1]}`} className="mono" style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 500, color: "var(--cobalt)" }}>public page and badge →</a>}
          </div>
        )}

        {accepts && !busy && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em" }}>Full report · 402 Payment Required</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 300, color: "var(--ink-2)" }}>The evidence, the next steps and the full provenance are sold to agents over x402. One 402, and the client picks the rail it can pay on:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {accepts.map((a) => (
                <div key={a.network} className="rail-row">
                  <span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{RAIL[a.network] ?? a.network} <span style={{ fontSize: 11, color: "var(--ink-4)" }}>{a.network}</span></span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: "var(--cobalt)", whiteSpace: "nowrap" }}>{price(a)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {report && !busy && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "none" }}>full report · {report.agent.name ?? "(unnamed)"}</div>
            <div className="badge mono" style={{ fontSize: 20, fontWeight: 500, color: COLOR[report.assessment.verdict] ?? "var(--ink)" }}>{report.assessment.verdict}</div>
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
    </div>
  );
}
