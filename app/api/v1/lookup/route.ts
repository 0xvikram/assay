import { NextResponse, type NextRequest } from "next/server";
import { lookupCounterparty } from "@/src/engine/lookup";
import { errorResponse, tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Free: which registered agents a payment would go to. Identity is directory
 * data, like the chain list; what costs is the evidence about them. The guard
 * calls this with a 402's payTo and resource before any payment is signed.
 */
export async function GET(req: NextRequest) {
  const limited = tooManyFree(req, 30);
  if (limited) return limited;
  const q = req.nextUrl.searchParams;
  const address = q.get("address");
  const url = q.get("url");
  if (!address && !url) return NextResponse.json({ error: "Give an address (a 402's payTo), a url (its resource), or both." }, { status: 400 });
  try {
    return NextResponse.json(await lookupCounterparty({ address, url }));
  } catch (err) {
    return errorResponse(err);
  }
}
