import { NextResponse, type NextRequest } from "next/server";
import { checkWatches } from "@/src/saas/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel's daily cron. It sends CRON_SECRET as a bearer token; nothing else may start the job. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await checkWatches();
  console.log(JSON.stringify({ t: new Date().toISOString(), cron: "watch", checked: results.length, changed: results.filter((r) => r.changed).length }));
  return NextResponse.json({ checked: results.length, results });
}
