"use client";
import { useEffect, useState } from "react";

type Source = { key: string; protocol: string; network: string; healthy: boolean; schemaVersion: string; methodologyVersion: string; unhealthyReason?: string };
type Preview = {
  a: string; b: string; comparability: string; statement: string;
  versions: { key: string; schemaVersion: string; methodologyVersion: string; network: string }[];
};

/** The pairs that make the argument, in the order they make it: comparable, then each way it is not. */
const PAIRS: { a: string; b: string; label: string }[] = [
  { a: "compound-v3-ethereum", b: "spark-lend-ethereum", label: "Compound ↔ Spark" },
  { a: "aave-v3-gnosis", b: "spark-lend-gnosis", label: "Aave ↔ Spark · Gnosis" },
  { a: "aave-v3-ethereum", b: "spark-lend-ethereum", label: "Aave ↔ Spark" },
  { a: "aave-v3-ethereum", b: "morpho-aave-v3-ethereum", label: "Aave ↔ Morpho" },
];

const TONE: Record<string, string> = {
  COMPARABLE: "var(--mint)",
  METHODOLOGY_MISMATCH: "var(--gold)",
  SCHEMA_MISMATCH: "var(--coral)",
  REGISTRY_DRIFT: "var(--coral)",
};

/**
 * Whether two subgraphs may be compared is free — it follows from the version
 * triple the registry already publishes. What they actually say costs $0.002,
 * because that is the read. This panel shows the half that carries the point.
 */
export default function Lending() {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [pair, setPair] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/lending/sources")
      .then((r) => r.json())
      .then((d) => setSources(d.sources as Source[]))
      .catch(() => setSources([]));
  }, []);

  useEffect(() => {
    let alive = true;
    const p = PAIRS[pair]!;
    setBusy(true); setError(null);
    fetch(`/api/v1/lending/preview?a=${p.a}&b=${p.b}`)
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (alive) { setPreview(d as Preview); setBusy(false); } })
      .catch((e) => { if (alive) { setError((e as Error).message); setBusy(false); } });
    return () => { alive = false; };
  }, [pair]);

  const tone = preview ? TONE[preview.comparability] ?? "var(--ink)" : "var(--ink)";
  const servable = sources?.filter((s) => s.healthy) ?? [];
  const refused = sources?.filter((s) => !s.healthy) ?? [];

  return (
    <div className="glass lend" style={{ padding: "clamp(18px, 2.2vw, 30px)", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
      <div className="eyebrow" style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11, letterSpacing: "0.12em" }}>
        <span>Composition</span>
        <span><span className="live-dot" aria-hidden="true" />{sources ? `${servable.length} servable · ${refused.length} refused` : "live · Messari"}</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PAIRS.map((p, i) => (
          <button key={p.label} type="button" className="chip" onClick={() => setPair(i)}
            style={i === pair ? { color: "var(--ink)", borderColor: "rgba(255,255,255,0.55)" } : undefined}>
            {p.label}
          </button>
        ))}
      </div>

      {error && <div style={{ color: "var(--coral)", fontSize: 14 }}>refused: {error}</div>}
      {busy && !error && (
        <div className="skel-stack" style={{ borderTop: 0, paddingTop: 0 }} aria-label="reading both subgraphs">
          <div className="skel" style={{ height: 17, width: "46%" }} />
          <div className="skel" style={{ height: 13, width: "94%" }} />
          <div className="skel" style={{ height: 13, width: "70%" }} />
          <div className="lend-versions"><div className="skel" style={{ height: 64 }} /><div className="skel" style={{ height: 64 }} /></div>
        </div>
      )}

      {preview && !busy && !error && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="badge mono" style={{ fontSize: 17, fontWeight: 500, color: tone, overflowWrap: "anywhere" }}>
            {preview.comparability}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, fontWeight: 300, color: "var(--ink-2)" }}>{preview.statement}</p>

          <div className="lend-versions">
            {preview.versions.map((v) => (
              <div key={v.key} className="lend-ver">
                <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)", overflowWrap: "anywhere" }}>{v.key}</div>
                <div className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>
                  schema <b style={{ fontWeight: 500 }}>{v.schemaVersion}</b> · methodology <b style={{ fontWeight: 500 }}>{v.methodologyVersion}</b>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{v.network}</div>
              </div>
            ))}
          </div>

          <div className="mono" style={{ fontSize: 11, lineHeight: 1.7, color: "var(--ink-4)", paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            comparability is free · the reconciled figures are $0.002 at <span style={{ color: "var(--ink-3)" }}>/api/v1/lending/market</span>
          </div>
        </div>
      )}

      {refused.length > 0 && (
        <div style={{ paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em" }}>Refused rather than guessed</div>
          {refused.map((s) => (
            <div key={s.key} className="mono" style={{ fontSize: 11, lineHeight: 1.6, color: "var(--ink-4)" }}>
              <span style={{ color: "var(--coral)" }}>{s.key}</span> — {s.unhealthyReason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
