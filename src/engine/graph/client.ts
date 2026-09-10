import { readFileSync } from "node:fs";
import { resolve } from "node:path";
/** All the client needs of a source: a name for errors, and what to query. */
export interface GraphSource { name: string; subgraphId: string }

function loadKey(): string {
  if (process.env.GRAPH_API_KEY) return process.env.GRAPH_API_KEY;
  try {
    // Only reached outside a hosted environment, where the key is a real env var.
    const env = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    const m = env.match(/^GRAPH_API_KEY=(.+)$/m);
    if (m?.[1]) return m[1].trim();
  } catch { /* fall through */ }
  throw new Error("GRAPH_API_KEY is not set. Copy .env.example to .env and add your gateway key.");
}

// Resolved on first use, not at import: a build step or a test may load this
// module without ever touching the gateway.
let KEY: string | null = null;

export interface GraphMeta {
  deployment: string;
  blockNumber: number;
  blockTimestamp: number | null;
  hasIndexingErrors: boolean;
}

export interface GraphResult<T> {
  data: T;
  meta: GraphMeta;
  /** Wall-clock ms the gateway took, kept for the provenance envelope. */
  latencyMs: number;
}

const META_FRAGMENT = `_meta { deployment hasIndexingErrors block { number timestamp } }`;

/**
 * Every query carries _meta so the answer can name the exact deployment and block
 * it was read at. An answer without that is not evidence.
 *
 * `declarations` is the operation's variable list. GraphQL rejects a declared
 * variable that goes unused, so callers state exactly what their body consumes.
 */
export async function query<T>(
  chain: GraphSource,
  body: string,
  variables: Record<string, unknown> = {},
  declarations = "$id: ID!, $first: Int",
  attempt = 0,
): Promise<GraphResult<T>> {
  KEY ??= loadKey();
  const url = `https://gateway.thegraph.com/api/${KEY}/subgraphs/id/${chain.subgraphId}`;
  const gql = `query Assay${declarations ? `(${declarations})` : ""} { ${META_FRAGMENT} ${body} }`;
  const started = Date.now();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "assay/0.1 (+erc8004)" },
    body: JSON.stringify({ query: gql, variables }),
    signal: AbortSignal.timeout(45_000),
  });

  const text = await res.text();
  if (!res.ok) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      return query<T>(chain, body, variables, declarations, attempt + 1);
    }
    throw new Error(`${chain.name}: gateway HTTP ${res.status} — ${text.slice(0, 160)}`);
  }

  let json: { data?: Record<string, unknown>; errors?: { message: string }[] };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`${chain.name}: non-JSON gateway response — ${text.slice(0, 160)}`);
  }
  if (json.errors?.length) throw new Error(`${chain.name}: ${json.errors.map((e) => e.message).join("; ")}`);
  if (!json.data) throw new Error(`${chain.name}: empty response`);

  const m = json.data["_meta"] as
    | { deployment: string; hasIndexingErrors: boolean; block: { number: number; timestamp: number | null } }
    | undefined;
  if (!m) throw new Error(`${chain.name}: subgraph returned no _meta — refusing to treat this as evidence`);

  return {
    data: json.data as T,
    meta: {
      deployment: m.deployment,
      blockNumber: m.block.number,
      blockTimestamp: m.block.timestamp,
      hasIndexingErrors: m.hasIndexingErrors,
    },
    latencyMs: Date.now() - started,
  };
}
