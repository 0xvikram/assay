import { type NextRequest } from "next/server";
import { withAccount } from "@/src/http/account";
import { escalationsFor, keysOf, policyOf, usageOf, watchesOf } from "@/src/saas/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Everything the dashboard shows, in one read of the ledger. */
export async function GET(req: NextRequest) {
  return withAccount(req, async (account) => {
    const policy = await policyOf(account);
    const [keys, usage, escalations, watches] = await Promise.all([keysOf(account), usageOf(account), escalationsFor(policy.policyId), watchesOf(account)]);
    return { account, policy, keys, usage, escalations, watches };
  });
}
