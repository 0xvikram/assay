import { type NextRequest } from "next/server";
import { withAccount, body } from "@/src/http/account";
import { removeWatch } from "@/src/saas/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ watchId: string }> }) {
  const { watchId } = await params;
  return withAccount(req, async (account) => { await removeWatch(account, watchId); return { removed: watchId }; });
}
