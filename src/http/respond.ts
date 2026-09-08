import { NextResponse, type NextRequest } from "next/server";

/**
 * Best-effort per-instance limiter for the free routes. Serverless instances do
 * not share memory, so this is a courtesy fence, not a guarantee — the paid
 * routes are their own rate limit, which is rather the point of the product.
 */
const WINDOW_MS = 60_000;
const FREE_PER_WINDOW = 10;
/**
 * The ledger is a cheap read of already-public mirror node data, and our own
 * page polls it. Sharing the 10/min evidence budget meant a visitor who left
 * the ledger open rate-limited themselves out of their own UI.
 */
const LEDGER_PER_WINDOW = 60;
const hits = new Map<string, { n: number; start: number }>();

export function tooManyFree(req: NextRequest, budget = FREE_PER_WINDOW): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}|${budget}`;
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.start > WINDOW_MS) {
    hits.set(key, { n: 1, start: now });
    return null;
  }
  h.n++;
  if (h.n <= budget) return null;
  return NextResponse.json(
    { error: "rate_limited", detail: `${budget} free requests per minute per IP. The paid routes have no such limit.` },
    { status: 429, headers: { "Retry-After": String(Math.ceil((WINDOW_MS - (now - h.start)) / 1000)) } },
  );
}

export { LEDGER_PER_WINDOW };

/** One JSON line per request so hosted logs stay greppable in the hour they exist. */
export function logRequest(route: string, req: NextRequest, status: number, startedAt: number, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    t: new Date().toISOString(),
    route,
    path: req.nextUrl.pathname,
    status,
    ms: Date.now() - startedAt,
    ua: req.headers.get("user-agent")?.slice(0, 80) ?? null,
    ...extra,
  }));
}

/** Engine errors are worded for humans; map the words to the status they mean. */
export function errorResponse(err: unknown): NextResponse {
  const msg = (err as Error)?.message ?? String(err);
  const status =
    /Unknown chain|No agent|neither an address/.test(msg) ? 404 :
    /no reliable indexer/.test(msg) ? 503 :
    /gateway HTTP|non-JSON|empty response|no _meta/.test(msg) ? 502 :
    /Reference must be/.test(msg) ? 400 : 500;
  return NextResponse.json({ error: msg }, { status });
}
