import { type NextRequest } from "next/server";
import { withAccount } from "@/src/http/account";
import { checkWatches } from "@/src/saas/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The daily job, run now for one account — so a change can be seen without waiting for tomorrow. */
export async function POST(req: NextRequest) {
  return withAccount(req, async (account) => ({ results: await checkWatches(account) }));
}
