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
    return <p style={{ color: "var(--gold)", fontSize: 14 }}>World ID is not configured on this deployment (NEXT_PUBLIC_WLD_APP_ID / NEXT_PUBLIC_WLD_RP_ID).</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button onClick={() => void begin()} className="btn" style={{ width: "100%", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
        <span>I&apos;m here — approve with a Selfie Check</span>
      </button>
      {status && <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)" }}>{status}</p>}
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
      <p className="mono" style={{ margin: 0, textAlign: "center", fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-4)" }}>
        World ID · {process.env.NEXT_PUBLIC_WLD_ENVIRONMENT ?? "sandbox"} · abuse prevention, not KYC
      </p>
    </div>
  );
}
