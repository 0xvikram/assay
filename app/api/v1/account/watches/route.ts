import { type NextRequest } from "next/server";
import { withAccount, body } from "@/src/http/account";
import { addWatch } from "@/src/saas/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return withAccount(req, async (account) => {
    const b = await body<{ ref?: string; webhook?: string | null }>(req);
    return addWatch(account, (b.ref ?? "").trim(), b.webhook?.trim() || null);
  });
}
