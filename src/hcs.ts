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

/**
 * Best effort by design: a receipt that fails to write must never fail the
 * paid response the customer already settled for. Returns the sequence number
 * or null, and says why in the log.
 */
export async function submitReceipt(receipt: Receipt): Promise<number | null> {
  const topic = process.env.HCS_TOPIC_ID;
  if (!topic) {
    console.warn(JSON.stringify({ t: receipt.ts, hcs: "skipped", reason: "HCS_TOPIC_ID not set" }));
    return null;
  }
  let client: Client | null = null;
  try {
    client = operator();
    const res = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topic))
      .setMessage(JSON.stringify(receipt))
      .execute(client);
    const r = await res.getReceipt(client);
    const seq = r.topicSequenceNumber ? Number(r.topicSequenceNumber.toString()) : null;
    console.log(JSON.stringify({ t: receipt.ts, hcs: "written", topic, seq, route: receipt.route, ref: receipt.ref }));
    return seq;
  } catch (err) {
    console.warn(JSON.stringify({ t: receipt.ts, hcs: "failed", topic, error: (err as Error).message }));
    return null;
  } finally {
    client?.close();
  }
}

/** Read the trail back the way anyone else can: from the mirror node, no key. */
export async function readReceipts(limit = 100): Promise<{ seq: number; consensusAt: string; receipt: Receipt | null }[]> {
  const topic = process.env.HCS_TOPIC_ID;
  if (!topic) return [];
  const res = await fetch(`${MIRROR}/api/v1/topics/${topic}/messages?limit=${limit}&order=desc`, {
    headers: { "User-Agent": "assay/0.1 (+hcs)" }, signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`mirror node HTTP ${res.status}`);
  const json = (await res.json()) as { messages: { sequence_number: number; consensus_timestamp: string; message: string }[] };
  return json.messages.map((m) => {
    let receipt: Receipt | null = null;
    try { receipt = JSON.parse(Buffer.from(m.message, "base64").toString("utf8")) as Receipt; } catch { /* foreign message on our topic */ }
    return { seq: m.sequence_number, consensusAt: m.consensus_timestamp, receipt };
  });
}
