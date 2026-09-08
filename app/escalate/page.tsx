import Escalate from "../components/Escalate";

export const metadata = { title: "Assay — approve an escalation" };

export default async function EscalatePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const mandateId = q["mandate"] ?? "default";
  const escalationId = q["id"] ?? "";
  const newCap = q["cap"] ?? "";
  const why = q["why"] ?? "";
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.5rem", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>An agent wants a bigger envelope</h1>
      <p style={{ opacity: 0.8, marginTop: "0.5rem" }}>
        Mandate <code>{mandateId}</code> · escalation <code>{escalationId || "(none)"}</code> · requested cap <code>{newCap || "?"}</code>
      </p>
      <p>
        Raising a spending cap is the one thing an agent must not do for itself. A live human approves it here with a
        Selfie Check, and the approval is written to the same public ledger as every payment the agent makes.
      </p>
      {escalationId ? <Escalate mandateId={mandateId} escalationId={escalationId} newCap={newCap} why={why} /> : <p style={{ color: "#A9772A" }}>No escalation id in the URL.</p>}
    </main>
  );
}
