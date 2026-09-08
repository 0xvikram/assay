import Escalate from "../components/Escalate";

export const metadata = { title: "Assay — approve an escalation" };

export default async function EscalatePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const mandateId = q["mandate"] ?? "default";
  const escalationId = q["id"] ?? "";
  const newCap = q["cap"] ?? "";
  const why = q["why"] ?? "";
  return (
    <main style={{ position: "relative", minHeight: "100vh", backgroundColor: "var(--bg)", backgroundImage: "url(/temple-tall.jpg)", backgroundSize: "cover", backgroundPosition: "center top" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,10,140,0.15) 0%, rgba(10,10,140,0.6) 40%, var(--bg) 72%)" }} />
      <div className="fade-in" style={{ position: "relative", maxWidth: 520, margin: "0 auto", padding: "clamp(120px, 34vh, 340px) clamp(18px, 5vw, 24px) 48px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="eyebrow">Step-up · mandate {mandateId} · escalation {escalationId || "(none)"}</div>
        <h1 className="h-display t-h2">An agent wants <span className="serif">a bigger envelope.</span></h1>
        <p className="t-lead" style={{ margin: 0 }}>
          Raising a cap is the one thing an agent must not do for itself. A live human approves it here, and the approval is written to the same public ledger as every payment the agent makes.
        </p>
        <div className="glass" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", borderRadius: 18, fontSize: 13, fontWeight: 300, color: "var(--ink-2)" }}>
          <Row k="requested cap" v={newCap || "?"} />
          <Row k="reason" v={why || "—"} />
          <Row k="written to" v={process.env.HCS_TOPIC_ID ? `HCS ${process.env.HCS_TOPIC_ID}` : "HCS (unconfigured)"} />
        </div>
        {escalationId ? <Escalate mandateId={mandateId} escalationId={escalationId} newCap={newCap} why={why} /> : <p style={{ color: "var(--gold)" }}>No escalation id in the URL.</p>}
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><span style={{ flexShrink: 0 }}>{k}</span><span className="mono" style={{ color: "var(--ink)", textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{v}</span></div>;
}
