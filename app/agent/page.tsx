import Link from "next/link";
import { redirect } from "next/navigation";
import PageHead from "../components/PageHead";
import Footer from "../components/Footer";
import { Arrow } from "../components/Art";
import { lookupCounterparty, type CounterpartyLookup } from "@/src/engine/lookup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Assay — look up an agent" };

const MATCHED: Record<string, string> = { owner: "owns it", agentWallet: "is its wallet", endpoint: "claims this URL" };

/** The free door for people: paste whatever you have about an agent and get to its page. */
export default async function Lookup({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = (await searchParams)["q"]?.trim() ?? "";
  const ref = /^([a-z0-9-]+):(\d+)$/i.exec(q);
  if (ref) redirect(`/agent/${ref[1]!.toLowerCase()}/${ref[2]}`);

  let result: CounterpartyLookup | null = null;
  let error: string | null = null;
  const isAddress = /^0x[0-9a-fA-F]{40}$/.test(q);
  const isUrl = /^https?:\/\//i.test(q);
  if (q && !isAddress && !isUrl) error = "Paste a chain and agent number (base:25975), a 0x wallet address, or an https:// URL.";
  else if (q) {
    try { result = await lookupCounterparty(isAddress ? { address: q } : { url: q }); }
    catch (e) { error = (e as Error).message; }
  }

  return (
    <main>
      <PageHead
        art="/brand/eye.webp"
        eyebrow="Lookup · free"
        title={<>Who is this agent, <span className="serif">and is its record real?</span></>}
        lead="Paste what you have: a chain and agent number, the wallet you're about to pay, or the URL the agent serves from."
      >
        <form action="/agent" method="get" className="hero-form" role="search">
          <input id="q" name="q" defaultValue={q} placeholder="base:25975 · 0x… · https://…" aria-label="agent, wallet address or URL" spellCheck={false} />
          <button type="submit" className="pill pill-solid"><span>Look up</span><Arrow /></button>
        </form>
      </PageHead>
      <div className="wrap page-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {error && <p style={{ margin: 0, color: "var(--coral)" }}>{error}</p>}
        {result && (
          result.matches.length ? (
            <>
              <div className="eyebrow">{result.matches.length} registered agent{result.matches.length > 1 ? "s" : ""} · {result.chainsQueried.length} chains read</div>
              <div className="trail-list">
                {result.matches.map((m) => (
                  <Link key={m.ref} href={`/agent/${m.chain}/${m.agentId}`} className="glass result-row">
                    <span className="mono" style={{ fontSize: 13, color: "var(--ink)" }}>{m.ref}</span>
                    <span style={{ fontSize: 14, color: "var(--ink-2)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name ?? "unnamed"} <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>· {q.slice(0, 10)}… {MATCHED[m.matchedOn]}</span></span>
                    <Arrow size={14} />
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "var(--ink-2)" }}>No registered agent on the {result.chainsQueried.length} chains we read matches that {isAddress ? "address" : "URL"}. Unregistered isn&apos;t the same as bad — it just means there&apos;s no public record to check.</p>
          )
        )}
        {result?.failures.length ? <p className="mono" style={{ margin: 0, fontSize: 11.5, color: "var(--ink-3)" }}>Not read: {result.failures.map((f) => f.chain).join(", ")}</p> : null}
      </div>
      <Footer />
    </main>
  );
}
