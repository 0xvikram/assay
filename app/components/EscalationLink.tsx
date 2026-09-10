"use client";
import { useState } from "react";
import QRCode from "qrcode";

/** A short, unguessable-enough id. The approval is bound to it, so each one is single-use. */
const newId = () => `esc-${Math.random().toString(36).slice(2, 6)}`;

/**
 * In a real run the paying agent mints this link itself, the moment its mandate
 * needs a human (`npm run agent:pay -- <ref> --wait`). This builds the same link
 * by hand, so a step-up can be tried without a terminal — and shows it as a QR,
 * because the approval happens on a phone.
 *
 * World binds each proof to the escalation id as its signal, so an id can be
 * approved exactly once. That is why the button always mints a fresh one.
 */
export default function EscalationLink() {
  const [cap, setCap] = useState("$5.00");
  const [why, setWhy] = useState("bigger sample");
  const [url, setUrl] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);

  async function create() {
    const q = new URLSearchParams({ mandate: "default", id: newId(), cap: cap.trim() || "$5.00", why: why.trim() || "raise the envelope" });
    const link = `${window.location.origin}/escalate?${q.toString()}`;
    setUrl(link); setCopied(false);
    setSvg(await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1a5c", light: "#ffffff" } }));
  }

  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  }

  return (
    <div className="glass" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "18px 18px 20px", borderRadius: 18 }}>
      <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em" }}>Create an escalation</div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, fontWeight: 300, color: "var(--ink-2)" }}>
        Normally the paying agent opens this when its mandate needs a human. Make one here to try the step-up — each link can be approved once.
      </p>
      <div className="esc-fields">
        <label className="esc-field"><span>requested cap</span><input className="input mono" value={cap} onChange={(e) => setCap(e.target.value)} aria-label="requested cap" /></label>
        <label className="esc-field"><span>reason</span><input className="input" value={why} onChange={(e) => setWhy(e.target.value)} aria-label="reason" /></label>
      </div>
      <button type="button" className="btn" onClick={() => void create()} style={{ borderRadius: 999 }}>{url ? "Create a new link" : "Create escalation link"}</button>

      {url && (
        <div className="fade-in esc-out">
          <div className="esc-qr" aria-label="QR code for the escalation link" dangerouslySetInnerHTML={{ __html: svg }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 11, lineHeight: 1.6, color: "var(--ink-3)", overflowWrap: "anywhere" }}>{url}</div>
            <div style={{ fontSize: 12, fontWeight: 300, color: "var(--ink-3)" }}>Scan with the phone that has World ID installed.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="chip" onClick={() => void copy()}>{copied ? "copied ✓" : "copy link"}</button>
              <a className="chip" href={url} style={{ display: "inline-flex", alignItems: "center" }}>open here</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
