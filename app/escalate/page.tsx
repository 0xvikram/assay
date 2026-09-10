import Link from "next/link";
import Escalate from "../components/Escalate";
import EscalationLink from "../components/EscalationLink";
import { Mark } from "../components/Art";

export const metadata = { title: "Assay — approve an escalation" };

/** Opened from a QR code on a phone, so it is one column, the temple above and the decision below it. */
export default async function EscalatePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const mandateId = q["mandate"] ?? "default";
  const escalationId = q["id"] ?? "";
  const newCap = q["cap"] ?? "";
  const why = q["why"] ?? "";
  return (
    <main className="escalate-shell">
      <div className="escalate-art" aria-hidden="true"><img src="/brand/temple.webp" alt="" /></div>
      <div className="wrap nav"><Link href="/" className="wordmark"><Mark /><span>ASSAY</span></Link><Link href="/trail" className="pill">Ledger</Link></div>
      <div className="fade-in" style={{ position: "relative", maxWidth: 520, margin: "0 auto", padding: "clamp(150px, 34vh, 330px) clamp(18px, 5vw, 24px) 64px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="eyebrow">{escalationId ? `Step-up · mandate ${mandateId} · escalation ${escalationId}` : "Step-up · World ID"}</div>
        <h1 className="h-display t-h2">An agent wants <span className="serif">a bigger envelope.</span></h1>
        <p className="t-lead" style={{ margin: 0 }}>
          Raising a cap is the one thing an agent must not do for itself. A live human approves it here, and the approval is written to the same public ledger as every payment the agent makes.
        </p>
        {escalationId && (
          <div className="glass" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", borderRadius: 18, fontSize: 13, color: "var(--ink-2)" }}>
            <Row k="requested cap" v={newCap || "?"} />
            <Row k="reason" v={why || "—"} />
            <Row k="written to" v={process.env.HCS_TOPIC_ID ? `HCS ${process.env.HCS_TOPIC_ID}` : "HCS (unconfigured)"} />
          </div>
        )}
        {escalationId ? (
          <>
            <Escalate mandateId={mandateId} escalationId={escalationId} newCap={newCap} why={why} />
            <Link href="/escalate" className="mono" style={{ alignSelf: "center", fontSize: 12, color: "var(--ink-3)" }}>create another escalation →</Link>
          </>
        ) : <EscalationLink />}
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span style={{ flexShrink: 0 }}>{k}</span><span className="mono" style={{ color: "var(--ink)", textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{v}</span></div>;
}
