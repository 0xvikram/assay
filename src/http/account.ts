import { NextResponse, type NextRequest } from "next/server";
import { AccountError, accountFromRequest } from "../saas/accounts";

/** Every account route: resolve the signed-in account, run, and turn failures into a status and a sentence. */
export async function withAccount(req: NextRequest, fn: (account: string) => Promise<unknown>): Promise<NextResponse> {
  try {
    const account = await accountFromRequest(req);
    return NextResponse.json(await fn(account));
  } catch (e) {
    if (e instanceof AccountError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.warn(JSON.stringify({ t: new Date().toISOString(), route: req.nextUrl.pathname, error: (e as Error).message }));
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Parse a JSON body, or fail with a sentence rather than a stack. */
export async function body<T>(req: NextRequest): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new AccountError(400, "The request body has to be JSON."); }
}
