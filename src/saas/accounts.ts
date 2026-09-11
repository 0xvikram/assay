import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PrivyClient } from "@privy-io/node";
import {
  readAll, submitMessage,
  type AlertSent, type ApiKeyIssued, type ApiKeyRevoked, type Approval, type EscalationRequested,
  type PolicySet, type Receipt, type TopicMessage, type TopicRow, type WatchSet,
} from "../hcs";
import { assay } from "../engine/assay";
import { DEFAULT_RULES, type PolicyRules } from "./policy";

/**
 * The SaaS layer, with no database: accounts, keys, policies and watchlists
 * are messages on the same Hedera topic as every payment, read back from the
 * mirror node. What reaches the ledger is never secret — an account is an HMAC
 * of the login, a key only its hash, a webhook URL only sealed.
 */

/** A failure the account routes return as-is: a status and a sentence a person can act on. */
export class AccountError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function dataKey(): Buffer {
  const k = process.env.ASSAY_DATA_KEY;
  if (!k || !/^[0-9a-f]{64}$/i.test(k)) throw new AccountError(503, "Accounts aren't configured on this deployment (ASSAY_DATA_KEY is missing).");
  return Buffer.from(k, "hex");
}
const mac = (label: string) => createHmac("sha256", dataKey()).update(label).digest("hex");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const stamp = () => new Date().toISOString();
const SITE = (process.env.PUBLIC_BASE_URL ?? "https://assay-dusky.vercel.app").replace(/\/$/, "");

let privy: PrivyClient | null = null;
function privyClient(): PrivyClient {
  const appId = process.env.PRIVY_APP_ID, appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) throw new AccountError(503, "Sign-in isn't configured on this deployment (PRIVY_APP_ID / PRIVY_APP_SECRET).");
  return (privy ??= new PrivyClient({ appId, appSecret }));
}

/** The signed-in company, from the Privy access token on the request. */
export async function accountFromRequest(req: Request): Promise<string> {
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token || token.startsWith("ak_")) throw new AccountError(401, "Sign in to manage your account.");
  let userId: string;
  try { userId = (await privyClient().utils().auth().verifyAccessToken(token)).user_id; }
  catch { throw new AccountError(401, "Your session has expired. Sign in again."); }
  return `acct_${mac(`account:${userId}`).slice(0, 20)}`;
}

async function write(msg: TopicMessage): Promise<number> {
  const seq = await submitMessage(msg);
  if (seq == null) throw new AccountError(503, "The ledger didn't take the write just now. Try again in a moment.");
  return seq;
}

type WithSeq<T> = T & { seq: number };
function of<T extends TopicMessage>(rows: TopicRow[], type: T["type"]): WithSeq<T>[] {
  return rows.flatMap((r) => (r.message?.type === type ? [{ ...(r.message as T), seq: r.seq }] : []));
}

// ---- API keys ---------------------------------------------------------------

const KEY = /^ak_test_([0-9a-f]{8})_([0-9a-f]{48})$/;

export async function issueKey(account: string, label: string): Promise<{ key: string; keyId: string }> {
  const keyId = randomBytes(4).toString("hex");
  const key = `ak_test_${keyId}_${randomBytes(24).toString("hex")}`;
  await write({ type: "assay.apikey.v1", account, keyId, keyHash: sha256(key), label: label.trim().slice(0, 40) || "untitled", ts: stamp() });
  return { key, keyId };
}

export async function keysOf(account: string) {
  const rows = await readAll(0);
  const revoked = new Set(of<ApiKeyRevoked>(rows, "assay.apikey.revoked.v1").filter((r) => r.account === account).map((r) => r.keyId));
  return of<ApiKeyIssued>(rows, "assay.apikey.v1")
    .filter((k) => k.account === account)
    .map((k) => ({ keyId: k.keyId, label: k.label, createdAt: k.ts, revoked: revoked.has(k.keyId) }))
    .reverse();
}

export async function revokeKey(account: string, keyId: string) {
  if (!(await keysOf(account)).some((k) => k.keyId === keyId && !k.revoked)) throw new AccountError(404, "There's no active key with that id on your account.");
  await write({ type: "assay.apikey.revoked.v1", account, keyId, ts: stamp() });
}

/** Which account a presented key belongs to, or null. Compared in constant time; a revoked key is simply unknown. */
export async function accountForKey(key: string): Promise<string | null> {
  const m = KEY.exec(key);
  if (!m) return null;
  const rows = await readAll();
  const issued = of<ApiKeyIssued>(rows, "assay.apikey.v1").find((k) => k.keyId === m[1]);
  if (!issued) return null;
  const a = Buffer.from(issued.keyHash, "hex"), b = Buffer.from(sha256(key), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (of<ApiKeyRevoked>(rows, "assay.apikey.revoked.v1").some((r) => r.keyId === issued.keyId && r.account === issued.account)) return null;
  return issued.account;
}

// ---- policy -----------------------------------------------------------------

/** One policy per account, with a stable id the guard and the paying agent are configured with. */
export const policyIdOf = (account: string) => `pol_${mac(`policy:${account}`).slice(0, 16)}`;

export async function policyOf(account: string) {
  const p = of<PolicySet>(await readAll(0), "assay.policy.v1").filter((x) => x.account === account).at(-1);
  return { policyId: policyIdOf(account), rules: p?.rules ?? DEFAULT_RULES, saved: !!p, savedAt: p?.ts ?? null };
}

export async function policyById(policyId: string) {
  const p = of<PolicySet>(await readAll(), "assay.policy.v1").filter((x) => x.policyId === policyId).at(-1);
  return p ? { policyId, rules: p.rules, savedAt: p.ts } : null;
}

export async function setPolicy(account: string, rules: PolicyRules) {
  const policyId = policyIdOf(account);
  await write({ type: "assay.policy.v1", account, policyId, rules, ts: stamp() });
  return policyId;
}

// ---- approvals ----------------------------------------------------------------

/** Every escalation an agent raised under this policy, newest first, with the approval if a person gave one. */
export async function escalationsFor(mandateId: string) {
  const rows = await readAll(0);
  const approvals = of<Approval>(rows, "assay.approval.v1").filter((a) => a.mandateId === mandateId);
  return of<EscalationRequested>(rows, "assay.escalation.v1")
    .filter((e) => e.mandateId === mandateId)
    .reverse()
    .map((e) => {
      const a = approvals.find((x) => x.escalationId === e.escalationId);
      return { escalationId: e.escalationId, ref: e.ref, cap: e.cap, why: e.why, requestedAt: e.ts, seq: e.seq, approved: a ? { at: a.ts, seq: a.seq, credential: a.credential } : null };
    });
}

// ---- usage ----------------------------------------------------------------------

/** Reports an account's keys fetched this month: the bill, read off the ledger. */
export async function usageOf(account: string, month = new Date().toISOString().slice(0, 7)) {
  const mine = of<Receipt>(await readAll(0), "assay.receipt.v1").filter((r) => r.network === "apikey" && r.payer === account && r.ts.startsWith(month));
  const usd = mine.reduce((sum, r) => sum + (Number(String(r.amount ?? "").replace(/[^0-9.]/g, "")) || 0), 0);
  return {
    month,
    reports: mine.length,
    usd: Math.round(usd * 10_000) / 10_000,
    recent: mine.slice(-25).reverse().map((r) => ({ seq: r.seq, at: r.ts, route: r.route, ref: r.ref, verdict: r.verdict, amount: r.amount })),
  };
}

// ---- watchlist and alerts ----------------------------------------------------------

function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", dataKey(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), ct].map((b) => b.toString("base64url")).join(".");
}
function unseal(sealed: string): string {
  const [iv, tag, ct] = sealed.split(".").map((s) => Buffer.from(s, "base64url"));
  const d = createDecipheriv("aes-256-gcm", dataKey(), iv!);
  d.setAuthTag(tag!);
  return Buffer.concat([d.update(ct!), d.final()]).toString("utf8");
}

/** A webhook is a request our server makes on someone's behalf, so it may only go to a public https host. */
function checkHook(hook: string) {
  let u: URL;
  try { u = new URL(hook); } catch { throw new AccountError(400, "That webhook isn't a valid URL."); }
  const h = u.hostname.toLowerCase();
  if (u.protocol !== "https:") throw new AccountError(400, "The webhook has to be an https:// URL.");
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("[")) {
    throw new AccountError(400, "The webhook has to be a public hostname, not an IP address or a local name.");
  }
}

function latestWatches(rows: TopicRow[]) {
  const m = new Map<string, WithSeq<WatchSet>>();
  for (const w of of<WatchSet>(rows, "assay.watch.v1")) m.set(w.watchId, w);
  return [...m.values()];
}

export async function watchesOf(account: string) {
  const rows = await readAll(0);
  const alerts = of<AlertSent>(rows, "assay.alert.v1");
  return latestWatches(rows)
    .filter((w) => w.account === account && w.active)
    .map((w) => {
      const last = alerts.filter((a) => a.watchId === w.watchId).at(-1);
      return { watchId: w.watchId, ref: w.ref, baseline: w.baseline, current: last?.to ?? w.baseline, since: w.ts, hasWebhook: !!w.hook, lastAlert: last ? { at: last.ts, from: last.from, to: last.to, delivered: last.delivered } : null };
    })
    .reverse();
}

export async function addWatch(account: string, ref: string, hook?: string | null) {
  if (hook) checkHook(hook);
  let verdict: string;
  try { verdict = (await assay(ref)).assessment.verdict; }
  catch (e) { throw new AccountError(400, (e as Error).message); }
  const watchId = `w_${randomBytes(5).toString("hex")}`;
  await write({ type: "assay.watch.v1", account, watchId, ref, baseline: verdict, hook: hook ? seal(hook) : null, active: true, ts: stamp() });
  return { watchId, ref, verdict };
}

export async function removeWatch(account: string, watchId: string) {
  const w = latestWatches(await readAll(0)).find((x) => x.watchId === watchId && x.account === account && x.active);
  if (!w) throw new AccountError(404, "There's no active watch with that id on your account.");
  const { seq: _seq, ...rest } = w;
  await write({ ...rest, active: false, ts: stamp() });
}

/**
 * Re-read every watched agent. Where a verdict moved, post to the owner's
 * webhook and write the change on the ledger — delivered or not, so the
 * account can see what it was told and when.
 */
export async function checkWatches(account?: string) {
  const rows = await readAll(0);
  const alerts = of<AlertSent>(rows, "assay.alert.v1");
  const active = latestWatches(rows).filter((w) => w.active && (!account || w.account === account));
  const out: { watchId: string; ref: string; verdict?: string; changed?: boolean; from?: string; delivered?: boolean | null; error?: string }[] = [];
  for (const w of active) {
    const last = alerts.filter((a) => a.watchId === w.watchId).at(-1)?.to ?? w.baseline;
    let verdict: string;
    try { verdict = (await assay(w.ref)).assessment.verdict; }
    catch (e) { out.push({ watchId: w.watchId, ref: w.ref, error: (e as Error).message }); continue; }
    if (verdict === last) { out.push({ watchId: w.watchId, ref: w.ref, verdict, changed: false }); continue; }
    let delivered: boolean | null = null;
    if (w.hook) {
      try {
        const r = await fetch(unseal(w.hook), {
          method: "POST",
          headers: { "content-type": "application/json", "user-agent": "assay/0.1 (+watch)" },
          body: JSON.stringify({ type: "assay.verdict_changed", ref: w.ref, from: last, to: verdict, page: `${SITE}/agent/${w.ref.replace(":", "/")}`, at: stamp() }),
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        });
        delivered = r.ok;
      } catch { delivered = false; }
    }
    await write({ type: "assay.alert.v1", account: w.account, watchId: w.watchId, ref: w.ref, from: last, to: verdict, delivered, ts: stamp() });
    out.push({ watchId: w.watchId, ref: w.ref, verdict, changed: true, from: last, delivered });
  }
  return out;
}
