# World — integration feedback (Selfie Check track)

Written while integrating, not after. Dated entries; the ask is stated where we have one.

## 2026-09-06 — finding the Sandbox

- **Observation:** searching "World sandbox form" from the ETHGlobal prize page led nowhere for
  a while; the working link was a `forms.gle` short URL that 302s to a Google Form. It is not
  linked from the docs' Sandbox pages, which point at the Developer Portal instead.
- **Ask:** one canonical entry point. If the Developer Portal → *World ID Sandbox* panel is the
  real path (it appears to be), retire the form or link the two.

## 2026-09-08 — Sandbox access and Selfie Check flag

- **Observation:** Selfie Check (Beta) is a separate feature flag from Sandbox access. The docs
  say "request access through your World point of contact" — a hackathon participant has no
  point of contact, only `developers@toolsforhumanity.com`. Five teams in the ETHOnline Discord
  reported the same wait on 2026-09-08 (Mandate, ProofPay, Herit, Veyra, LitClinic).
- **Ask:** during a sponsored hackathon, auto-enable the Selfie Check flag for any app whose
  Sandbox request is approved, or give the prize page a single "request both" link with a
  stated SLA.
- **Observation (good):** the Android path is clearly documented — Developer Portal → World ID
  Sandbox → Google account → private Play testing track — and the docs are candid that the
  semi-cold journey "reliably works on Android today" while iOS has an invite-code gap. That
  honesty saved us a decision.
- **Observation:** the Play testing link only works if the browser and the Play Store are signed
  into the *same* Google account; the docs say so, but it is easy to miss. Worth a call-out box.
- **Observation:** a mini app needs no store install — the QR generator on *Testing your mini app*
  is excellent. It does need a public HTTPS origin, which is a real constraint on day one
  (we solved it with Vercel).

## Integration notes (filled during Phase H)

- IDKit preset / widget used: `IDKitInviteCodeRequestWidget` with `selfieCheckLegacy`, `environment: "sandbox"`
- Backend verify: `POST https://developer.world.org/api/v4/verify/{rp_id}`
- Framing: Selfie Check is an **abuse-prevention / continuity** signal for raising an agent's
  spend cap — not KYC. A live human must be present at the moment a bigger envelope is granted.
- _(to be completed: error codes seen, portal navigation notes, time from request to approval)_

## Status

| Item | Requested | Granted |
|---|---|---|
| Sandbox access (form) | 2026-09-06 | — |
| Sandbox Android tester (Developer Portal) | 2026-09-08 | — |
| Selfie Check (Beta) flag | 2026-09-08 | — |
