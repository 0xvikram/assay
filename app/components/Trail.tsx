"use client";
import { useEffect, useState } from "react";

type Entry =
  | { kind: "receipt"; seq: number; at: string; messageUrl: string; route: string; ref: string; verdict: string; payer: string | null; amount: string | null; asset: string | null; network: string; settlementTxId: string | null; settlementUrl: string | null }
  | { kind: "approval"; seq: number; at: string; messageUrl: string; mandateId: string; escalationId: string; newCap: string; credential: string };

const VERDICT: Record<string, string> = { VERIFIED: "var(--mint)", UNPROVEN: "var(--gold)", WASH_REPUTATION_DETECTED: "var(--coral)" };
const RAIL: Record<string, string> = { "hedera:testnet": "Hedera", "eip155:5042002": "Arc", "eip155:84532": "Base Sepolia" };

function amountLabel(e: Extract<Entry, { kind: "receipt" }>) {
  if (e.network.startsWith("hedera")) return `${(Number(e.amount) / 1e8).toFixed(2)} ℏ`;
  if (e.amount) return `${(Number(e.amount) / 1e6).toFixed(3)} USDC`;
  return "";
}

/**
 * Every paid call and every human approval, read from Hedera Consensus
 * Service through the public mirror node — no database behind this list.
 */
export default function Trail({ limit = 8, compact = false }: { limit?: number; compact?: boolean }) {
  const [data, setData] = useState<{ topic: string | null; topicUrl?: string; entries: Entry[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/v1/trail?limit=${limit}`).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (alive) { setData(d); setError(null); } })
      .catch((e) => { if (alive) setError((e as Error).message); });
    void load();
    const t = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(t); };
  }, [limit]);

  if (error) return <div style={{ color: "var(--coral)", fontSize: 14 }}>ledger unreachable: {error}</div>;
  if (!data) return <div className="mono" style={{ fontSize: 12, color: "var(--ink-4)" }}>reading the mirror node…</div>;
  if (!data.topic) return <div className="mono" style={{ fontSize: 12, color: "var(--ink-4)" }}>no receipt topic configured on this deployment</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.entries.map((e) => (
        <a key={e.seq} href={e.kind === "receipt" && e.settlementUrl ? e.settlementUrl : e.messageUrl} target="_blank" rel="noreferrer" className="glass" style={{ display: "grid", gridTemplateColumns: compact ? "56px minmax(0, 1fr) auto" : "56px 120px minmax(0, 1fr) auto auto", gap: 16, alignItems: "center", padding: "14px 18px", borderRadius: 16, color: "inherit" }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-4)" }}>#{e.seq}</span>
          {!compact && <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{new Date(e.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
          {e.kind === "receipt" ? (
            <>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 14 }}>
                  <span style={{ color: VERDICT[e.verdict] ?? "var(--ink)" }}>{e.verdict || "—"}</span>
                  <span style={{ color: "var(--ink-3)" }}> · {e.ref || e.route}</span>
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>paid by {e.payer ?? "—"}{e.settlementTxId ? ` · ${e.settlementTxId}` : ""}</span>
              </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{RAIL[e.network] ?? e.network}</span>
              <span className="mono" style={{ fontSize: 13, color: "var(--gold)", textAlign: "right" }}>{amountLabel(e)}</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 14 }}>human approval <span style={{ color: "var(--ink-3)" }}>· escalation {e.escalationId} → cap {e.newCap}</span></span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>World ID</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--mint)", textAlign: "right" }}>{e.credential}</span>
            </>
          )}
        </a>
      ))}
      {data.topicUrl && <a href={data.topicUrl} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12, color: "var(--ink-3)", alignSelf: "flex-end" }}>topic {data.topic} on HashScan ↗</a>}
    </div>
  );
}
