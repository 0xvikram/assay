import { type NextRequest } from "next/server";
import { withAccount, body } from "@/src/http/account";
import { revokeKey } from "@/src/saas/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ keyId: string }> }) {
  const { keyId } = await params;
  return withAccount(req, async (account) => { await revokeKey(account, keyId); return { revoked: keyId }; });
}
