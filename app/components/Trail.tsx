"use client";
import { useEffect, useRef, useState } from "react";

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

const when = (at: string) => new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * Every paid call and every human approval, read from Hedera Consensus
 * Service through the public mirror node — no database behind this list.
 *
 * The free routes are rate limited, and this component used to poll straight
 * through a 429 and print the raw error, so a couple of reloads left the page
 * looking broken. It now backs off and says what is actually happening.
 */
export default function Trail({ limit = 8, compact = false }: { limit?: number; compact?: boolean }) {
  const [data, setData] = useState<{ topic: string | null; topicUrl?: string; entries: Entry[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    const schedule = (ms: number) => { if (alive) timer.current = setTimeout(load, ms); };

    async function load() {
      try {
        const r = await fetch(`/api/v1/trail?limit=${limit}`);
        if (r.status === 429) {
          const retry = Math.max(10, Number(r.headers.get("Retry-After") ?? 30));
          if (!alive) return;
          setWaiting(retry);
          schedule(retry * 1000);
          return;
        }
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
        const d = await r.json();
        if (!alive) return;
        setData(d); setError(null); setWaiting(0);
        schedule(30_000);
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message);
        schedule(60_000);
      }
    }

    void load();
    return () => { alive = false; if (timer.current) clearTimeout(timer.current); };
  }, [limit]);

  const note = (text: string, color = "var(--ink-4)") => <div className="mono" style={{ fontSize: 12, color }}>{text}</div>;

  if (waiting && !data) return note(`the free ledger read is rate limited — retrying in ${waiting}s`, "var(--gold)");
  if (error && !data) return note(`ledger unreachable: ${error}`, "var(--coral)");
  if (!data) return note("reading the mirror node…");
  if (!data.topic) return note("no receipt topic configured on this deployment");
  if (!data.entries.length) return note("no receipts on this topic yet");

  return (
    <div className="trail-list">
      {data.entries.map((e) => (
        <a
          key={e.seq}
          href={e.kind === "receipt" && e.settlementUrl ? e.settlementUrl : e.messageUrl}
          target="_blank"
          rel="noreferrer"
          className={`glass trail-row${compact ? " trail-row--compact" : ""}`}
        >
          <span className="mono trail-seq">#{e.seq}</span>
          <span className="mono trail-when">{when(e.at)}</span>
          {e.kind === "receipt" ? (
            <>
              <span className="trail-main">
                <span>
                  <span style={{ color: VERDICT[e.verdict] ?? "var(--ink)" }}>{e.verdict || "—"}</span>
                  <span style={{ color: "var(--ink-3)" }}> · {e.ref || e.route}</span>
                </span>
                <span className="mono trail-sub">paid by {e.payer ?? "—"}{e.settlementTxId ? ` · ${e.settlementTxId}` : ""}</span>
              </span>
              <span className="mono trail-rail">{RAIL[e.network] ?? e.network}</span>
              <span className="mono trail-amt">{amountLabel(e)}</span>
            </>
          ) : (
            <>
              <span className="trail-main">
                <span>human approval</span>
                <span className="trail-sub">escalation {e.escalationId} → cap {e.newCap}</span>
              </span>
              <span className="mono trail-rail">World ID</span>
              <span className="mono trail-amt" style={{ color: "var(--mint)" }}>{e.credential}</span>
            </>
          )}
        </a>
      ))}
      {data.topicUrl && (
        <a href={data.topicUrl} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12, color: "var(--ink-3)", alignSelf: "flex-end" }}>
          topic {data.topic} on HashScan ↗
        </a>
      )}
    </div>
  );
}
