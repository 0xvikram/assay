"use client";
import { useState } from "react";
import { IDKitRequestWidget, selfieCheckLegacy, type IDKitResult, type RpContext } from "@worldcoin/idkit";

type Props = { mandateId: string; escalationId: string; newCap: string; why: string };

const APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID ?? "";
const RP_ID = process.env.NEXT_PUBLIC_WLD_RP_ID ?? "";
const ACTION = process.env.NEXT_PUBLIC_WLD_ACTION ?? "assay-escalation";

/**
 * The step-up. An agent wants a bigger envelope; a live human has to be here
 * to grant it. Selfie Check is deliberately the low-friction credential — this
 * is abuse prevention and continuity, not KYC. The proof is bound to the
 * escalation id as the signal, so an approval cannot be replayed onto another.
 */
export default function Escalate({ mandateId, escalationId, newCap, why }: Props) {
  const [open, setOpen] = useState(false);
  const [rp, setRp] = useState<RpContext | null>(null);
  const [status, setStatus] = useState<string>("");

  async function begin() {
    setStatus("requesting signature…");
    const r = await fetch("/api/rp-signature", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: ACTION }) });
    if (!r.ok) { setStatus(`cannot start: ${(await r.json()).error ?? r.status}`); return; }
    const s = await r.json();
    setRp({ rp_id: RP_ID, nonce: s.nonce, created_at: s.created_at, expires_at: s.expires_at, signature: s.sig });
    setStatus("");
    setOpen(true);
  }

  async function handleVerify(result: IDKitResult) {
    const r = await fetch("/api/verify-proof", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rp_id: RP_ID, idkitResponse: result, escalation: { mandateId, id: escalationId, newCap } }),
    });
    if (!r.ok) throw new Error((await r.json()).error ?? "backend verification failed");
  }

  if (!APP_ID || !RP_ID) {
    return <p style={{ color: "#A9772A" }}>World ID is not configured on this deployment (NEXT_PUBLIC_WLD_APP_ID / NEXT_PUBLIC_WLD_RP_ID).</p>;
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <button onClick={() => void begin()} style={{ padding: "0.7rem 1.2rem", font: "inherit", fontWeight: 700, border: "1px solid #0F2226", borderRadius: 6, background: "#0F2226", color: "#EFEFEA", cursor: "pointer" }}>
        I&apos;m here — approve with a Selfie Check
      </button>
      {status && <p style={{ opacity: 0.8 }}>{status}</p>}
      {rp && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={APP_ID as `app_${string}`}
          action={ACTION}
          rp_context={rp}
          allow_legacy_proofs={true}
          preset={selfieCheckLegacy({ signal: escalationId })}
          handleVerify={handleVerify}
          onSuccess={() => setStatus(`approved — escalation ${escalationId} raised the cap to ${newCap}. The agent will see it on the ledger.`)}
          onError={(e) => setStatus(`not approved: ${String(e)}`)}
          environment={(process.env.NEXT_PUBLIC_WLD_ENVIRONMENT as "sandbox" | "staging" | "production" | undefined) ?? "sandbox"}
        />
      )}
      <p style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "1rem" }}>
        Reason given by the agent: <em>{why || "—"}</em>. Environment: {process.env.NEXT_PUBLIC_WLD_ENVIRONMENT ?? "sandbox"}.
      </p>
    </div>
  );
}
