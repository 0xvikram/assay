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

## 2026-09-09 — the blocker was a setup step nobody surfaced

- **Observation:** the Portal let us create an app, and an `rp_id` was present in our environment,
  while **World ID had never been configured for that app**. `get_world_id_registration_status`
  returned `World ID is not configured for this app` and `rp_registration` was `[]`. Meanwhile
  `/api/rp-signature` failed with `RP_SIGNING_KEY is not configured`, which reads like a *missing
  secret* rather than a *missing registration*. We spent a day hunting for a key that had never
  been minted, including looking inside the World App itself.
- **Root cause once found:** the RP signing key is only ever returned at generation or rotation
  (`configure_world_id` / `rotate_world_id_signing_key`); no dashboard screen can display it. That
  is correct security design, but it means a developer who has not yet run configuration has no
  way to distinguish "I lost my key" from "I never had one".
- **Ask:** in the Portal, show an explicit *World ID: not configured* state on the app page with a
  one-click **Configure World ID** action, and make the absence of an RP visible before a developer
  goes looking for a key. A one-line hint on the RP Signatures doc — *"if you have no RP yet, run
  configure first; the key is minted with the RP"* — would have saved the whole detour.
- **What worked well:** the **Developer Portal MCP** solved it in four calls once connected —
  `get_team_context` → `get_app_config` → `configure_world_id` → `create_world_id_action`. Being
  able to pass our own `signer_private_key` so the private key is never returned over the wire is
  a genuinely good design and we used it. Recommend linking the MCP from the Sandbox pages, not
  only from the MCP section; it is the fastest path through setup and we found it late.
- **Sandbox alignment was painless:** IDKit accepts `environment: "sandbox"`, and the docs are
  explicit that sandbox proofs still verify against the production endpoint
  (`/api/v4/verify/{rp_id}`). Nothing else was required — that instruction is clear and correct.

### Status

| Item | Requested | Resolved |
|---|---|---|
| Sandbox access (form) | 2026-09-06 | — |
| Sandbox Android tester | 2026-09-08 | 2026-09-09 — app installed |
| World ID RP registration | — | 2026-09-09, self-served via MCP |
| RP signing key | — | 2026-09-09, minted locally, never transmitted |
| Selfie Check (Beta) flag | 2026-09-08 | outstanding |
