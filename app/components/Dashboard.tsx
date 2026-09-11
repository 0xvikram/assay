"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import type { PolicyRules } from "@/src/saas/policy";
import { Arrow } from "./Art";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

type Key = { keyId: string; label: string; createdAt: string; revoked: boolean };
type Escalation = { escalationId: string; ref: string; cap: string; why: string; requestedAt: string; approved: { at: string; credential: string } | null };
type Watch = { watchId: string; ref: string; baseline: string; current: string; since: string; hasWebhook: boolean; lastAlert: { at: string; from: string; to: string; delivered: boolean | null } | null };
type Usage = { month: string; reports: number; usd: number; recent: { seq: number; at: string; route: string; ref: string; verdict: string; amount: string | null }[] };
type AccountData = {
  account: string;
  policy: { policyId: string; rules: PolicyRules; saved: boolean; savedAt: string | null };
  keys: Key[];
  usage: Usage;
  escalations: Escalation[];
  watches: Watch[];
};

const COLOR: Record<string, string> = { VERIFIED: "var(--mint)", UNPROVEN: "var(--gold)", WASH_REPUTATION_DETECTED: "var(--coral)" };
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const SITE = typeof window === "undefined" ? "" : window.location.origin;

/**
 * The company side of Assay. Sign-in is Privy (email, no wallet); the page
 * holds nothing itself — every list is read from the ledger through the
 * account API, and every change is a message written to it.
 */
export default function Dashboard() {
  if (!APP_ID) {
    return <div className="wrap page-body"><p style={{ color: "var(--gold)" }}>Sign-in isn&apos;t configured on this deployment (NEXT_PUBLIC_PRIVY_APP_ID).</p></div>;
  }
  return (
    <PrivyProvider appId={APP_ID} config={{ loginMethods: ["email"], appearance: { theme: "light", accentColor: "#1F3FC4", landingHeader: "Sign in to Assay" } }}>
      <Account />
    </PrivyProvider>
  );
}

function Account() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const [data, setData] = useState<AccountData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = await getAccessToken();
    if (!token) throw new Error("Your session has expired. Sign in again.");
    const r = await fetch(path, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j as { error?: string }).error ?? `HTTP ${r.status}`);
    return j as T;
  }, [getAccessToken]);

  const load = useCallback(async () => {
    try { setData(await api<AccountData>("/api/v1/account")); setError(null); }
    catch (e) { setError((e as Error).message); }
  }, [api]);

  // The ledger is read through a mirror node that trails the write by a few seconds; re-read once it has caught up.
  const settle = useCallback(() => { setTimeout(() => void load(), 6000); }, [load]);

  useEffect(() => { if (ready && authenticated) void load(); }, [ready, authenticated, load]);

  if (!ready) return <div className="wrap page-body"><div className="skel" style={{ height: 240, borderRadius: 22 }} /></div>;
  if (!authenticated) return <SignIn onLogin={() => login()} />;

  const email = user?.email?.address ?? "your account";
  return (
    <div className="wrap page-body" style={{ display: "flex", flexDirection: "column", gap: "clamp(28px, 4vw, 44px)" }}>
      <header className="dash-head">
        <div className="stack" style={{ gap: 12 }}>
          <div className="eyebrow">Dashboard · {email}</div>
          <h1 className="h-display t-h2">Your agents&apos; payments, <span className="serif">by your rules.</span></h1>
        </div>
        <button type="button" className="pill" onClick={() => void logout()}>Sign out</button>
      </header>

      {error && <p role="alert" style={{ margin: 0, color: "var(--coral)" }}>{error}</p>}
      {!data && !error && <div className="dash-tiles">{[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 96, borderRadius: 16 }} />)}</div>}

      {data && (
        <>
          <div className="dash-tiles">
            <Tile n={String(data.usage.reports)} k={`reports in ${new Date(`${data.usage.month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: "long" })}`} />
            <Tile n={money(data.usage.usd)} k="this month's bill" />
            <Tile n={String(data.keys.filter((k) => !k.revoked).length)} k="active API keys" />
            <Tile n={String(data.escalations.filter((e) => !e.approved).length)} k="waiting for approval" />
          </div>
          <div className="dash-grid">
            <Keys keys={data.keys} api={api} onChange={settle} />
            <Policy policy={data.policy} api={api} onSaved={(p) => setData({ ...data, policy: p })} />
            <Inbox escalations={data.escalations} policyId={data.policy.policyId} />
            <Watchlist watches={data.watches} api={api} onChange={settle} />
          </div>
          <UsagePanel usage={data.usage} />
        </>
      )}
    </div>
  );
}

function SignIn({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="wrap page-body">
      <div className="glass signin">
        <div className="stack" style={{ gap: 16 }}>
          <div className="eyebrow">Dashboard</div>
          <h1 className="h-display t-h2">Run your agents&apos; payments <span className="serif">by your rules.</span></h1>
          <p className="t-lead" style={{ maxWidth: 520 }}>One account for everything a company needs around Assay: API keys billed monthly, the policy your agents pay under, the approvals waiting for a person, a watchlist that alerts you when a verdict changes, and the audit trail.</p>
          <button type="button" className="pill pill-solid" style={{ alignSelf: "flex-start", padding: "14px 24px", fontSize: 15 }} onClick={onLogin}><span>Sign in with email</span><Arrow /></button>
          <p className="mono" style={{ margin: 0, fontSize: 11.5, color: "var(--ink-3)" }}>No wallet needed. Privy handles sign-in; the ledger only ever sees a one-way hash of your login.</p>
        </div>
        <ul className="signin-list">
          <li><b>API keys</b><span>Call every paid route with a key instead of a wallet; each call is metered on the public ledger.</span></li>
          <li><b>Payment policy</b><span>What your agents do with VERIFIED, UNPROVEN and a farm — and when a person has to say yes.</span></li>
          <li><b>Approvals inbox</b><span>Requests from your agents, approved with a World ID Selfie Check on a phone.</span></li>
          <li><b>Watchlist</b><span>Agents you pay regularly, re-checked daily, with a webhook when a verdict moves.</span></li>
        </ul>
      </div>
    </div>
  );
}

function Tile({ n, k }: { n: string; k: string }) {
  return <div className="tile"><div className="stat-n">{n}</div><div className="eyebrow" style={{ fontSize: 10.5, letterSpacing: "0.14em" }}>{k}</div></div>;
}

function Panel({ title, sub, children, id }: { title: string; sub?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section className="glass panel" aria-labelledby={id}>
      <div className="stack" style={{ gap: 6 }}>
        <h2 id={id} className="h-display t-h3">{title}</h2>
        {sub && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>{sub}</p>}
      </div>
      {children}
    </section>
  );
}

type Api = <T>(path: string, init?: RequestInit) => Promise<T>;

function Keys({ keys, api, onChange }: { keys: Key[]; api: Api; onChange: () => void }) {
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<{ key: string; keyId: string; label: string } | null>(null);
  const [local, setLocal] = useState<Key[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const shown = [...local.filter((l) => !keys.some((k) => k.keyId === l.keyId)), ...keys];

  async function create() {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ key: string; keyId: string }>("/api/v1/account/keys", { method: "POST", body: JSON.stringify({ label }) });
      setFresh({ ...r, label: label || "untitled" });
      setLocal((l) => [{ keyId: r.keyId, label: label || "untitled", createdAt: new Date().toISOString(), revoked: false }, ...l]);
      setLabel(""); onChange();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  async function revoke(keyId: string) {
    setErr(null);
    try { await api(`/api/v1/account/keys/${keyId}`, { method: "DELETE" }); setLocal((l) => l.map((k) => (k.keyId === keyId ? { ...k, revoked: true } : k))); onChange(); }
    catch (e) { setErr((e as Error).message); }
  }

  return (
    <Panel id="keys-h" title="API keys" sub="For servers and teams: call any paid route with a key instead of a wallet. You're billed monthly for what you use.">
      <form className="dash-form" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <input id="key-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What it's for — e.g. procurement agent" aria-label="key label" maxLength={40} />
        <button type="submit" className="btn" disabled={busy}>{busy ? "Creating…" : "Create key"}</button>
      </form>
      {fresh && (
        <div className="reveal fade-in" role="status">
          <div className="eyebrow" style={{ fontSize: 10.5 }}>Your new key · shown once</div>
          <code className="reveal-key">{fresh.key}</code>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="chip" onClick={() => { void navigator.clipboard.writeText(fresh.key).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); }}>{copied ? "copied ✓" : "copy key"}</button>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Only its hash is stored. It works in a few seconds, once the ledger has it.</span>
          </div>
          <pre className="code">{`curl -H "Authorization: Bearer ${fresh.key.slice(0, 16)}…" \\\n  ${SITE}/api/v1/agents/base/25975`}</pre>
        </div>
      )}
      {err && <p role="alert" style={{ margin: 0, color: "var(--coral)", fontSize: 13.5 }}>{err}</p>}
      {shown.length ? (
        <ul className="row-list">
          {shown.map((k) => (
            <li key={k.keyId}>
              <span className="row-main"><b>{k.label}</b><small className="mono">ak_test_{k.keyId}_… · created {day(k.createdAt)}</small></span>
              {k.revoked ? <span className="chip-static">revoked</span> : <button type="button" className="chip" onClick={() => void revoke(k.keyId)}>Revoke</button>}
            </li>
          ))}
        </ul>
      ) : <p className="empty">No keys yet.</p>}
    </Panel>
  );
}

function Seg<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label={name}>
      {options.map(([v, label]) => (
        <label key={v} className={`seg-opt${value === v ? " on" : ""}`}>
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
          {label}
        </label>
      ))}
    </div>
  );
}

function Policy({ policy, api, onSaved }: { policy: AccountData["policy"]; api: Api; onSaved: (p: AccountData["policy"]) => void }) {
  const [r, setR] = useState<PolicyRules>(policy.rules);
  const [ask, setAsk] = useState(policy.rules.approveAboveUsd != null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof PolicyRules>(k: K, v: PolicyRules[K]) => { setR((x) => ({ ...x, [k]: v })); setMsg(null); };

  async function save() {
    setBusy(true); setMsg(null);
    const rules = { ...r, approveAboveUsd: ask ? r.approveAboveUsd ?? 5 : null };
    try {
      const out = await api<{ policyId: string; rules: PolicyRules }>("/api/v1/account/policy", { method: "PUT", body: JSON.stringify({ rules }) });
      onSaved({ policyId: out.policyId, rules: out.rules, saved: true, savedAt: new Date().toISOString() });
      setMsg({ ok: true, text: "Saved to the ledger. Running agents pick it up within five minutes." });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  }

  return (
    <Panel id="policy-h" title="Payment policy" sub={<>What your agents do with each verdict. The guard in your agent reads it by id: <code>{policy.policyId}</code></>}>
      <form className="policy" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="policy-row"><span className="policy-label" style={{ color: COLOR.VERIFIED }}>VERIFIED</span>
          <Seg name="verified" value={r.verified} options={[["pay", "Pay"], ["approve", "Ask a person"]]} onChange={(v) => set("verified", v)} /></div>
        <div className="policy-row"><span className="policy-label" style={{ color: COLOR.UNPROVEN }}>UNPROVEN</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Seg name="unproven" value={r.unproven} options={[["pay", "Pay"], ["cap", "Pay up to"], ["refuse", "Refuse"]]} onChange={(v) => set("unproven", v)} />
            {r.unproven === "cap" && <label className="money"><span>$</span><input id="unproven-cap" type="number" min={0} step="0.01" value={r.unprovenCapUsd} onChange={(e) => set("unprovenCapUsd", Number(e.target.value))} aria-label="cap for UNPROVEN payees, in dollars" /></label>}
          </div></div>
        <div className="policy-row"><span className="policy-label" style={{ color: COLOR.WASH_REPUTATION_DETECTED }}>WASH</span>
          <Seg name="wash" value={r.wash} options={[["refuse", "Refuse"], ["approve", "Ask a person"]]} onChange={(v) => set("wash", v)} /></div>
        <div className="policy-row"><span className="policy-label">NOT REGISTERED</span>
          <Seg name="unregistered" value={r.unregistered} options={[["pay", "Pay"], ["refuse", "Refuse"]]} onChange={(v) => set("unregistered", v)} /></div>
        <div className="policy-row"><span className="policy-label">ANY PAYEE</span>
          <label className="check"><input id="ask-above" type="checkbox" checked={ask} onChange={(e) => { setAsk(e.target.checked); setMsg(null); }} /> Ask a person above</label>
          {ask && <label className="money"><span>$</span><input id="approve-above" type="number" min={0} step="0.01" value={r.approveAboveUsd ?? 5} onChange={(e) => set("approveAboveUsd", Number(e.target.value))} aria-label="approval threshold in dollars" /></label>}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" className="btn" disabled={busy}>{busy ? "Saving…" : policy.saved ? "Save changes" : "Save and activate"}</button>
          {msg ? <span role="status" style={{ fontSize: 13, color: msg.ok ? "var(--mint)" : "var(--coral)" }}>{msg.text}</span>
            : <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{policy.saved && policy.savedAt ? `Last saved ${when(policy.savedAt)}` : "Not active until saved"}</span>}
        </div>
      </form>
      <pre className="code">{`withAssayGuard(client, { policy: "${policy.policyId}" })`}</pre>
    </Panel>
  );
}

function Inbox({ escalations, policyId }: { escalations: Escalation[]; policyId: string }) {
  return (
    <Panel id="inbox-h" title="Approvals" sub={<>When one of your agents asks for more than the policy allows, it waits here for a person. Point your paying agent at this inbox with <code>MANDATE_ID={policyId}</code>.</>}>
      {escalations.length ? (
        <ul className="row-list">
          {escalations.map((e) => {
            const q = new URLSearchParams({ mandate: policyId, id: e.escalationId, cap: e.cap, why: e.why });
            return (
              <li key={e.escalationId}>
                <span className="row-main"><b>{e.ref} <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>· cap {e.cap}</span></b><small>{e.why} · {when(e.requestedAt)}</small></span>
                {e.approved
                  ? <span className="chip-static ok">approved · {e.approved.credential}</span>
                  : <a className="chip" href={`/escalate?${q.toString()}`} target="_blank" rel="noreferrer">Approve with a Selfie Check ↗</a>}
              </li>
            );
          })}
        </ul>
      ) : <p className="empty">Nothing waiting. Payments inside the policy never come here.</p>}
    </Panel>
  );
}

function Watchlist({ watches, api, onChange }: { watches: Watch[]; api: Api; onChange: () => void }) {
  const [ref, setRef] = useState("");
  const [hook, setHook] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [local, setLocal] = useState<Watch[]>([]);
  const [gone, setGone] = useState<string[]>([]);
  const shown = [...local.filter((l) => !watches.some((w) => w.watchId === l.watchId)), ...watches].filter((w) => !gone.includes(w.watchId));

  async function add() {
    setBusy("add"); setErr(null); setNote(null);
    try {
      const r = await api<{ watchId: string; ref: string; verdict: string }>("/api/v1/account/watches", { method: "POST", body: JSON.stringify({ ref, webhook: hook || null }) });
      setLocal((l) => [{ watchId: r.watchId, ref: r.ref, baseline: r.verdict, current: r.verdict, since: new Date().toISOString(), hasWebhook: !!hook, lastAlert: null }, ...l]);
      setRef(""); setHook(""); onChange();
    } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  }
  async function remove(id: string) {
    setErr(null);
    try { await api(`/api/v1/account/watches/${id}`, { method: "DELETE" }); setGone((g) => [...g, id]); onChange(); }
    catch (e) { setErr((e as Error).message); }
  }
  async function checkNow() {
    setBusy("check"); setErr(null); setNote(null);
    try {
      const r = await api<{ results: { ref: string; changed?: boolean; error?: string }[] }>("/api/v1/account/watches/check", { method: "POST" });
      const changed = r.results.filter((x) => x.changed).length;
      setNote(r.results.length ? `Checked ${r.results.length} · ${changed ? `${changed} changed` : "no change"}` : "Nothing to check yet.");
      if (changed) onChange();
    } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  }

  return (
    <Panel id="watch-h" title="Watchlist" sub="Agents you pay regularly. Re-checked every day at 06:00 UTC; when a verdict moves, your webhook hears about it and the change is written on the ledger.">
      <form className="dash-form wrap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <input id="watch-ref" className="input mono" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="base:25975" aria-label="agent to watch, as chain:agentId" required />
        <input id="watch-hook" className="input" value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Webhook URL (optional, https)" aria-label="webhook URL" />
        <button type="submit" className="btn" disabled={busy === "add"}>{busy === "add" ? "Reading…" : "Watch"}</button>
      </form>
      {err && <p role="alert" style={{ margin: 0, color: "var(--coral)", fontSize: 13.5 }}>{err}</p>}
      {shown.length ? (
        <ul className="row-list">
          {shown.map((w) => (
            <li key={w.watchId}>
              <span className="row-main">
                <b><a href={`/agent/${w.ref.replace(":", "/")}`}>{w.ref}</a> <span className="mono" style={{ fontSize: 12, fontWeight: 500, color: COLOR[w.current] ?? "var(--ink-3)" }}>{w.current}</span></b>
                <small>{w.lastAlert ? `changed ${w.lastAlert.from} → ${w.lastAlert.to} on ${day(w.lastAlert.at)}${w.lastAlert.delivered === false ? " · webhook failed" : w.lastAlert.delivered ? " · webhook delivered" : ""}` : `watching since ${day(w.since)}`}{w.hasWebhook ? " · webhook set" : ""}</small>
              </span>
              <button type="button" className="chip" onClick={() => void remove(w.watchId)}>Stop</button>
            </li>
          ))}
        </ul>
      ) : <p className="empty">Not watching anyone yet.</p>}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="pill" onClick={() => void checkNow()} disabled={busy === "check" || !shown.length}>{busy === "check" ? "Checking…" : "Check now"}</button>
        {note && <span role="status" style={{ fontSize: 13, color: "var(--ink-2)" }}>{note}</span>}
      </div>
    </Panel>
  );
}

function UsagePanel({ usage }: { usage: Usage }) {
  function download() {
    const rows = [["seq", "at", "route", "ref", "verdict", "amount"], ...usage.recent.map((u) => [u.seq, u.at, u.route, u.ref, u.verdict, u.amount ?? ""])];
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `assay-usage-${usage.month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <Panel id="usage-h" title="Usage and audit" sub="Every call made with your keys is a receipt on the public Hedera ledger, the same as a paid one — so the bill below is something anyone can recount.">
      {usage.recent.length ? (
        <div className="scroll-x">
          <table className="dash-table">
            <thead><tr><th>When</th><th>Agent</th><th>Verdict</th><th>Route</th><th style={{ textAlign: "right" }}>Cost</th></tr></thead>
            <tbody>
              {usage.recent.map((u) => (
                <tr key={u.seq}><td className="mono">{when(u.at)}</td><td className="mono">{u.ref}</td><td className="mono" style={{ color: COLOR[u.verdict] ?? "var(--ink-2)" }}>{u.verdict || "—"}</td><td className="mono">{u.route}</td><td className="mono" style={{ textAlign: "right" }}>{u.amount}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="empty">No calls with your keys this month yet.</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="pill" onClick={download} disabled={!usage.recent.length}>Download my usage (CSV)</button>
        <a className="pill" href="/api/v1/trail/export">Download the full ledger (CSV)</a>
      </div>
    </Panel>
  );
}
