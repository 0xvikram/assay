import Link from "next/link";
import { notFound } from "next/navigation";
import PageHead from "../../../components/PageHead";
import Footer from "../../../components/Footer";
import { assay, type AssayReport } from "@/src/engine/assay";
import { THRESHOLDS } from "@/src/engine/score/verdict";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ chain: string; agentId: string }> };

const COLOR: Record<string, string> = { VERIFIED: "var(--mint)", UNPROVEN: "var(--gold)", WASH_REPUTATION_DETECTED: "var(--coral)" };
const PHRASE: Record<string, string> = { VERIFIED: "verified by paying customers.", UNPROVEN: "not yet proven.", WASH_REPUTATION_DETECTED: "reputation manufactured." };
const SITE = (process.env.PUBLIC_BASE_URL ?? "https://assay-dusky.vercel.app").replace(/\/$/, "");
const pct = (x: number) => `${Math.round(x * 100)}%`;

export async function generateMetadata({ params }: Params) {
  const { chain, agentId } = await params;
  return { title: `Assay — ${chain}:${agentId}`, description: `Is the reputation of ${chain}:${agentId} real? Read live from the ERC-8004 registry.` };
}

/**
 * One agent's public page: the verdict, and what it would take to reach
 * VERIFIED. It shows the free preview and the progress, never the paid
 * evidence — a seller learns what to fix, a buyer learns whether to look closer.
 */
export default async function AgentPage({ params }: Params) {
  const { chain, agentId } = await params;
  const ref = `${chain}:${agentId}`;
  let r: AssayReport;
  try {
    r = await assay(ref);
  } catch (e) {
    const msg = (e as Error).message;
    if (/Unknown chain|No agent|Reference must be/.test(msg)) notFound();
    return (
      <main>
        <PageHead art="/brand/eye.webp" eyebrow={`Agent · ${ref}`} title={<>Couldn&apos;t read this agent <span className="serif">just now.</span></>} lead={msg} />
        <Footer />
      </main>
    );
  }

  const s = r.signals, T = THRESHOLDS, v = r.assessment.verdict;
  const critical = r.assessment.findings.filter((f) => f.severity === "critical").length;
  const steps = [
    { label: "Reviews backed by a payment", done: s.paidFeedback >= T.minPaidFeedback, note: `${s.paidFeedback} of ${T.minPaidFeedback}`, fill: Math.min(1, s.paidFeedback / T.minPaidFeedback) },
    { label: "Independent paying customers", done: s.paidPayers >= T.minPaidReviewers, note: `${s.paidPayers} of ${T.minPaidReviewers}`, fill: Math.min(1, s.paidPayers / T.minPaidReviewers) },
    { label: "No single payer behind most of them", done: s.paidPayers > 0 && s.paidTopPayerShare <= T.maxPaidTopShare, note: s.paidPayers ? `busiest payer ${pct(s.paidTopPayerShare)}, limit ${pct(T.maxPaidTopShare)}` : "no paid reviews yet", fill: null },
    { label: "Nothing manufactured", done: critical === 0, note: critical ? `${critical} critical finding${critical > 1 ? "s" : ""}` : "no critical findings", fill: null },
  ];
  const name = r.agent.name ?? `Agent #${agentId}`;
  const badge = `${SITE}/api/v1/badge/${chain}/${agentId}`;
  const page = `${SITE}/agent/${chain}/${agentId}`;

  return (
    <main>
      <PageHead
        art="/brand/columns.webp"
        eyebrow={`Agent · ${ref}`}
        title={<>{name}: <span className="serif" style={{ color: COLOR[v] }}>{PHRASE[v] ?? v}</span></>}
        lead={r.assessment.headline}
      />
      <div className="wrap page-body">
        <div className="grid-2" style={{ alignItems: "start" }}>
          <section className="glass" style={{ padding: "clamp(20px, 2.4vw, 30px)", display: "flex", flexDirection: "column", gap: 18 }} aria-labelledby="path-h">
            <div className="eyebrow" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 12px" }}><span id="path-h" style={{ whiteSpace: "nowrap" }}>The path to VERIFIED</span><span className="badge" style={{ color: COLOR[v], letterSpacing: "0.08em" }}>{v}</span></div>
            <ol className="path-list">
              {steps.map((st) => (
                <li key={st.label} className={`path-row${st.done ? " is-done" : ""}`}>
                  <span className="path-mark" aria-hidden="true">{st.done ? "✓" : ""}</span>
                  <span className="path-label">{st.label}<small>{st.note}</small></span>
                  {st.fill !== null && <span className="meter path-meter" aria-hidden="true"><i style={{ width: `${st.fill * 100}%`, background: st.done ? "var(--mint)" : "var(--cobalt)" }} /></span>}
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.assessment.confidence} aria-label="confidence"><i style={{ width: `${r.assessment.confidence}%`, background: COLOR[v] }} /></div>
              <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>confidence {r.assessment.confidence}/100 · earned only from payment-backed, independent reviews</div>
            </div>
            <div className="mono" style={{ fontSize: 11.5, lineHeight: 1.7, color: "var(--ink-3)", paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              {s.sample} reviews read · {s.distinctReviewers} reviewers · busiest reviewer {pct(s.topReviewerShare)}{r.agent.registeredDaysAgo != null ? ` · registered ${r.agent.registeredDaysAgo} days ago` : ""}<br />
              {r.provenance.chain} · deployment {r.provenance.deployment.slice(0, 12)}… · block {r.provenance.block}
            </div>
          </section>

          <div className="stack" style={{ gap: 16 }}>
            <section className="glass" style={{ padding: "clamp(20px, 2.4vw, 26px)", display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="badge-h">
              <div className="eyebrow" id="badge-h">Show it where you sell</div>
              <img src={`/api/v1/badge/${chain}/${agentId}`} alt={`Assay badge for ${ref}`} height={20} style={{ alignSelf: "flex-start" }} />
              <pre className="code">{`[![Assay verdict](${badge})](${page})`}</pre>
              <pre className="code">{`<a href="${page}"><img src="${badge}" alt="Assay verdict for ${ref}"></a>`}</pre>
              <p className="mono" style={{ margin: 0, fontSize: 11.5, color: "var(--ink-3)" }}>The badge follows the verdict, refreshed every fifteen minutes.</p>
            </section>
            <section className="glass" style={{ padding: "clamp(20px, 2.4vw, 26px)", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="pay-h">
              <div className="eyebrow" id="pay-h">About to pay this agent?</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>The full evidence — every finding, what would change the verdict, the exact block it was read at — is $0.001 over x402, or on a monthly plan.</p>
              <Link href={`/?ref=${ref}#console`} className="pill" style={{ alignSelf: "flex-start" }}>Open in the console</Link>
            </section>
            <section className="glass" style={{ padding: "clamp(20px, 2.4vw, 26px)", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="raise-h">
              <div className="eyebrow" id="raise-h">Is this your agent?</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}>Reviews don&apos;t raise this. Paid work does: when a customer&apos;s agent pays you through the Assay Guard, the payment leaves a review that carries its own proof. Three independent paying customers take you to VERIFIED.</p>
              <pre className="code">{`const pay = withAssayReceipts(wrapFetchWithPayment(fetch, client));`}</pre>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
