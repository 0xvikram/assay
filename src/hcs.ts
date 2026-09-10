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

export type TopicMessage = Receipt | Approval | Settlement;

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

export async function readApprovals(mandateId?: string, limit = 100): Promise<(Approval & { seq: number; consensusAt: string })[]> {
  const all = await readMessages(limit);
  return all
    .filter((m): m is { seq: number; consensusAt: string; message: Approval } => m.message?.type === "assay.approval.v1")
    .map((m) => ({ ...m.message, seq: m.seq, consensusAt: m.consensusAt }))
    .filter((a) => !mandateId || a.mandateId === mandateId);
}
