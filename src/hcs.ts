import type { PolicyRules } from "./saas/policy";
import {
  AccountId, Client, PrivateKey, TopicCreateTransaction, TopicMessageSubmitTransaction, TopicId,
} from "@hiero-ledger/sdk";

/**
 * A paid call leaves a receipt on Hedera Consensus Service. That topic is the
 * service's only store: receipts, mandate changes and approvals all land here
 * and are read back over the public mirror node, so nobody has to trust our
 * database — there isn't one.
 */
export interface Receipt {
  type: "assay.receipt.v1";
  route: string;
  ref: string;
  payer: string | null;
  amount: string | null;
  asset: string | null;
  network: string;
  settlementTxId: string | null;
  verdict: string;
  deployment: string;
  block: number;
  ts: string;
}

export const MIRROR = process.env.HEDERA_MIRROR_URL ?? "https://testnet.mirrornode.hedera.com";

function operator(): Client {
  const id = process.env.HEDERA_SERVICE_ACCOUNT_ID;
  const key = process.env.HEDERA_SERVICE_PRIVATE_KEY;
  if (!id || !key) throw new Error("HEDERA_SERVICE_ACCOUNT_ID / HEDERA_SERVICE_PRIVATE_KEY are not set.");
  return Client.forTestnet().setOperator(AccountId.fromString(id), PrivateKey.fromStringECDSA(key));
}

export async function createTopic(memo = "assay receipts"): Promise<string> {
  const client = operator();
  try {
    const res = await new TopicCreateTransaction().setTopicMemo(memo).execute(client);
    const receipt = await res.getReceipt(client);
    if (!receipt.topicId) throw new Error("TopicCreateTransaction returned no topicId");
    return receipt.topicId.toString();
  } finally {
    client.close();
  }
}

/** A human said yes to a bigger envelope, and proved they were there to say it. */
export interface Approval {
  type: "assay.approval.v1";
  mandateId: string;
  escalationId: string;
  newCap: string;
  /** World ID nullifier — the only anti-replay key; safe to store, reveals nothing. */
  nullifier: string;
  credential: string;
  ts: string;
}

/**
 * The counterparty leg. The mandate decided the agent should pay; the Privy
 * policy — owned by a key quorum, enforced outside the agent — decided whether
 * it may. Written either way, because a refusal is the control working and
 * belongs on the ledger next to the payment that prompted it.
 */
export interface Settlement {
  type: "assay.settlement.v1";
  /** The counterparty, as chain:agentId. */
  ref: string;
  /** The verdict the agent paid Assay for before deciding to pay the counterparty. */
  verdict: string;
  /** The wallet the counterparty declared in its own ERC-8004 registration. */
  recipient: string;
  valueWei: string;
  network: string;
  allowed: boolean;
  txHash: string | null;
  refusedBecause: string | null;
  ts: string;
}

/**
 * The account layer. Nothing secret is ever written here: an account is an
 * HMAC of the login, a key is stored only as its hash, and a webhook URL —
 * which often embeds a token — only encrypted.
 */
export interface ApiKeyIssued { type: "assay.apikey.v1"; account: string; keyId: string; keyHash: string; label: string; ts: string }
export interface ApiKeyRevoked { type: "assay.apikey.revoked.v1"; account: string; keyId: string; ts: string }
export interface PolicySet { type: "assay.policy.v1"; account: string; policyId: string; rules: PolicyRules; ts: string }
/** An agent asked for more than its policy allows; a person decides. The approval is an Approval with the same escalationId. */
export interface EscalationRequested { type: "assay.escalation.v1"; mandateId: string; escalationId: string; ref: string; cap: string; why: string; ts: string }
export interface WatchSet { type: "assay.watch.v1"; account: string; watchId: string; ref: string; baseline: string; hook: string | null; active: boolean; ts: string }
export interface AlertSent { type: "assay.alert.v1"; account: string; watchId: string; ref: string; from: string; to: string; delivered: boolean | null; ts: string }

export type TopicMessage = Receipt | Approval | Settlement | ApiKeyIssued | ApiKeyRevoked | PolicySet | EscalationRequested | WatchSet | AlertSent;

/** Every message on the topic goes through here; the type field says what it is. */
export async function submitMessage(msg: TopicMessage): Promise<number | null> {
  const topic = process.env.HCS_TOPIC_ID;
  if (!topic) {
    console.warn(JSON.stringify({ t: msg.ts, hcs: "skipped", type: msg.type, reason: "HCS_TOPIC_ID not set" }));
    return null;
  }
  let client: Client | null = null;
  try {
    client = operator();
    const res = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topic))
      .setMessage(JSON.stringify(msg))
      .execute(client);
    const r = await res.getReceipt(client);
    const seq = r.topicSequenceNumber ? Number(r.topicSequenceNumber.toString()) : null;
    console.log(JSON.stringify({ t: msg.ts, hcs: "written", topic, seq, type: msg.type }));
    return seq;
  } catch (err) {
    console.warn(JSON.stringify({ t: msg.ts, hcs: "failed", topic, type: msg.type, error: (err as Error).message }));
    return null;
  } finally {
    client?.close();
  }
}

/**
 * Best effort by design: a receipt that fails to write must never fail the
 * paid response the customer already settled for.
 */
export const submitReceipt = (receipt: Receipt) => submitMessage(receipt);

/** Read the trail back the way anyone else can: from the mirror node, no key. */
export async function readMessages(limit = 100): Promise<{ seq: number; consensusAt: string; message: TopicMessage | null }[]> {
  const topic = process.env.HCS_TOPIC_ID;
  if (!topic) return [];
  const res = await fetch(`${MIRROR}/api/v1/topics/${topic}/messages?limit=${limit}&order=desc`, {
    headers: { "User-Agent": "assay/0.1 (+hcs)" }, signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`mirror node HTTP ${res.status}`);
  const json = (await res.json()) as { messages: { sequence_number: number; consensus_timestamp: string; message: string }[] };
  return json.messages.map((m) => {
    let message: TopicMessage | null = null;
    try { message = JSON.parse(Buffer.from(m.message, "base64").toString("utf8")) as TopicMessage; } catch { /* foreign message on our topic */ }
    return { seq: m.sequence_number, consensusAt: m.consensus_timestamp, message };
  });
}

export interface TopicRow { seq: number; consensusAt: string; message: TopicMessage | null }

const parse = (m: { sequence_number: number; consensus_timestamp: string; message: string }): TopicRow => {
  let message: TopicMessage | null = null;
  try { message = JSON.parse(Buffer.from(m.message, "base64").toString("utf8")) as TopicMessage; } catch { /* foreign message on our topic */ }
  return { seq: m.sequence_number, consensusAt: m.consensus_timestamp, message };
};

let all: { at: number; rows: TopicRow[] } | null = null;

/**
 * The whole topic, oldest first. The account layer needs every key and policy
 * ever written, not the latest hundred messages, so this walks the mirror
 * node's pages — once, then only what is new since the last read.
 */
export async function readAll(maxAgeMs = 4_000): Promise<TopicRow[]> {
  const topic = process.env.HCS_TOPIC_ID;
  if (!topic) return [];
  if (all && Date.now() - all.at < maxAgeMs) return all.rows;
  const rows = all ? [...all.rows] : [];
  const last = rows.at(-1)?.seq ?? 0;
  let next: string | null = `/api/v1/topics/${topic}/messages?limit=100&order=asc${last ? `&sequencenumber=gt:${last}` : ""}`;
  for (let page = 0; next && page < 200; page++) {
    const res: Response = await fetch(`${MIRROR}${next}`, { headers: { "User-Agent": "assay/0.1 (+hcs)" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`mirror node HTTP ${res.status}`);
    const j = (await res.json()) as { messages: { sequence_number: number; consensus_timestamp: string; message: string }[]; links?: { next?: string | null } };
    rows.push(...j.messages.map(parse));
    next = j.messages.length ? j.links?.next ?? null : null;
  }
  all = { at: Date.now(), rows };
  return rows;
}

export async function readApprovals(mandateId?: string, limit = 100): Promise<(Approval & { seq: number; consensusAt: string })[]> {
  const all = await readMessages(limit);
  return all
    .filter((m): m is { seq: number; consensusAt: string; message: Approval } => m.message?.type === "assay.approval.v1")
    .map((m) => ({ ...m.message, seq: m.seq, consensusAt: m.consensusAt }))
    .filter((a) => !mandateId || a.mandateId === mandateId);
}
