import { type NextRequest } from "next/server";
import { withAccount, body } from "@/src/http/account";
import { AccountError, setPolicy } from "@/src/saas/accounts";
import { validateRules } from "@/src/saas/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  return withAccount(req, async (account) => {
    const raw = (await body<{ rules?: unknown }>(req)).rules;
    let rules;
    try { rules = validateRules(raw); } catch (e) { throw new AccountError(400, (e as Error).message); }
    return { policyId: await setPolicy(account, rules), rules };
  });
}
