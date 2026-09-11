import { type NextRequest } from "next/server";
import { withAccount, body } from "@/src/http/account";
import { issueKey } from "@/src/saas/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The key is returned once and only its hash is kept; losing it means issuing another. */
export async function POST(req: NextRequest) {
  return withAccount(req, async (account) => issueKey(account, (await body<{ label?: string }>(req)).label ?? ""));
}
