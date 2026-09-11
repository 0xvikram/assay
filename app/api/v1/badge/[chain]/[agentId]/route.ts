import { NextResponse, type NextRequest } from "next/server";
import { assay } from "@/src/engine/assay";
import { tooManyFree } from "@/src/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ chain: string; agentId: string }> };

const TONE: Record<string, [string, string]> = {
  VERIFIED: ["verified", "#13875a"],
  UNPROVEN: ["unproven", "#a86e06"],
  WASH_REPUTATION_DETECTED: ["wash reputation", "#cf3b29"],
};

/** Shields-style widths: close enough for an 11px sans, and it only has to fit its own text. */
const w = (s: string) => Math.round(s.length * 6.6 + 14);
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

function svg(label: string, color: string, title: string) {
  const left = "assay", lw = w(left), rw = w(label), total = lw + rw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><clipPath id="r"><rect width="${total}" height="20" rx="4"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#0b1a5c"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/></g><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle"><text x="${lw / 2}" y="14">${left}</text><text x="${lw + rw / 2}" y="14">${esc(label)}</text></g></svg>`;
}

/**
 * The seller's badge: the verdict as it stands, for a README, a listing or a
 * website. Free and cached at the edge — it says no more than the free
 * preview, and it links back to the page that shows how the verdict was reached.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const limited = tooManyFree(req, 60);
  if (limited) return limited;
  const { chain, agentId: raw } = await params;
  const agentId = raw.replace(/\.svg$/, "");
  let label = "unavailable", color = "#7c89b5", maxAge = 60;
  try {
    const r = await assay(`${chain}:${agentId}`);
    [label, color] = TONE[r.assessment.verdict] ?? [r.assessment.verdict.toLowerCase(), "#4f5e97"];
    maxAge = 900;
  } catch (e) {
    if (/Unknown chain|No agent|Reference must be/.test((e as Error).message)) label = "not registered";
  }
  return new NextResponse(svg(label, color, `Assay verdict for ${chain}:${agentId}: ${label}`), {
    headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": `public, max-age=300, s-maxage=${maxAge}, stale-while-revalidate=3600` },
  });
}
