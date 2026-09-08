import { keccak256, toBytes } from "viem";

/**
 * The Agent0 subgraph indexes registration and feedback files through
 * `file/ipfs` data sources — an https:// URI is never fetched and the file
 * stays null in every query. So files go to IPFS, and specifically to The
 * Graph's own node, which is the one the indexer reads from. No account, no
 * key; the CID is content-addressed so anyone can verify what was pinned.
 */
export const IPFS_API = process.env.IPFS_API_URL ?? "https://api.thegraph.com/ipfs/api/v0";

export interface Pinned { cid: string; uri: `ipfs://${string}`; bytes: Uint8Array; hash: `0x${string}` }

export async function pinJson(doc: unknown, filename = "file.json"): Promise<Pinned> {
  const text = JSON.stringify(doc, null, 2);
  const bytes = toBytes(text);
  const form = new FormData();
  form.append("file", new Blob([text], { type: "application/json" }), filename);
  const res = await fetch(`${IPFS_API}/add?pin=true`, { method: "POST", body: form, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`IPFS add failed: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  const { Hash: cid } = (await res.json()) as { Hash: string };
  if (!cid) throw new Error("IPFS add returned no hash");

  // Read it back before anyone is pointed at it.
  const back = await fetch(`${IPFS_API}/cat?arg=${cid}`, { signal: AbortSignal.timeout(30_000) });
  if (!back.ok || (await back.text()) !== text) throw new Error(`IPFS read-back of ${cid} did not match what was pinned`);

  return { cid, uri: `ipfs://${cid}`, bytes, hash: keccak256(bytes) };
}

export async function catJson<T>(cid: string): Promise<T> {
  const res = await fetch(`${IPFS_API}/cat?arg=${cid.replace(/^ipfs:\/\//, "")}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`IPFS cat ${cid}: HTTP ${res.status}`);
  return (await res.json()) as T;
}
