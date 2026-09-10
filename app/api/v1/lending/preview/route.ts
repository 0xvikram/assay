import { NextResponse, type NextRequest } from "next/server";
import { previewComparability } from "@/src/lending";
import { errorResponse, tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Free: can these two be compared at all, and which version says otherwise. */
export async function GET(req: NextRequest) {
  const limited = tooManyFree(req, 30);
  if (limited) return limited;
  const q = req.nextUrl.searchParams;
  const a = q.get("a") ?? "";
  const b = q.get("b") ?? "";
  if (!a || !b) return NextResponse.json({ error: "Name two sources: ?a=compound-v3-ethereum&b=spark-lend-ethereum" }, { status: 400 });
  try {
    return NextResponse.json(await previewComparability(a, b));
  } catch (err) {
    return errorResponse(err);
  }
}
