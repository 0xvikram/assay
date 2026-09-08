import Nav from "./components/Nav";
import Console from "./components/Console";
import Trail from "./components/Trail";
import { Mark } from "./components/Nav";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-scrim" />
        <Nav />
        <div className="hero-body wrap fade-in" style={{ width: "100%" }}>
          <div className="hero-row">
            <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 880 }}>
              <div className="eyebrow on-image" style={{ color: "var(--ink)" }}>ERC-8004 · read live from The Graph · sold over x402</div>
              <h1 className="h-display t-hero on-image">Know who you&apos;re paying <span className="serif">before</span> you pay them.</h1>
              <p className="t-lead on-image" style={{ maxWidth: 560 }}>Assay reads an agent&apos;s reputation as it stands on-chain, tells you whether it&apos;s real, and refuses to guess.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
              <a href="#console" className="pill pill-solid" style={{ padding: "16px 26px", fontSize: 16 }}>
                <span>Check an agent</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>
              </a>
              <div className="mono on-image" style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--ink-3)" }}>free preview · evidence from $0.001</div>
            </div>
          </div>
        </div>
      </section>

      <section id="console" className="dots section">
        <div className="wrap grid-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div className="eyebrow">01 · The problem</div>
            <h2 className="h-display t-h2">The most-reviewed agent on Base is <span className="serif">a farm.</span></h2>
            <p className="t-lead" style={{ maxWidth: 520 }}>309,734 reviews. Ninety-five percent from one wallet, every score identical, all inside one day, none backed by a payment. Any agent ranking by reputation would pick it first.</p>
            <div className="stats"><Stat n="95.5%" k="one wallet" /><Stat n="100%" k="one day" /><Stat n="0" k="payment-backed" /></div>
          </div>
          <Console />
        </div>
      </section>

      <section id="verdicts" className="dots section-tight">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="eyebrow">Three verdicts</div>
            <h2 className="h-display t-h2">Confidence is earned only from <span className="serif">payment-backed, independent</span> reviews.</h2>
          </div>
          <div className="grid-rails">
            <Verdict color="var(--mint)" name="VERIFIED" body="At least five reviews backed by verifiable on-chain payments, from at least three independent payers, none of them dominant. Confidence grows with depth and spread." />
            <Verdict color="var(--gold)" name="UNPROVEN" body="Reputation exists but nothing about it can be independently verified — or there is too little of it to judge. Not a punishment: every report ends with the priced path to VERIFIED." />
            <Verdict color="var(--coral)" name="WASH_REPUTATION_DETECTED" body="The signal was manufactured: one address wrote most of it, every score is identical and unpaid, it all landed in one day, or the agent reviewed itself. Payment-backed evidence can still outrank it." />
          </div>
        </div>
      </section>

      <section id="rails" className="dots section-tight">
        <div className="wrap">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, marginBottom: 32, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="eyebrow">02 · One 402, three rails</div>
              <h2 className="h-display t-h2">The client picks the rail <span className="serif">it can pay on.</span></h2>
            </div>
            <div className="mono" style={{ maxWidth: 360, fontSize: 12, lineHeight: 1.7, color: "var(--ink-3)" }}>same engine · same tiers · every settlement leaves a receipt on Hedera Consensus Service</div>
          </div>
          <div className="grid-rails">
            <Rail net="hedera:testnet" name="Hedera" body="Blocky402 verifies and settles; the facilitator pays the network fee." price="1,000,000 tinybar / verdict" />
            <Rail net="eip155:5042002" name="Arc" body="Signed off-chain, batched by Circle Gateway. No gas." price="$0.001 USDC / verdict" />
            <Rail net="eip155:84532" name="Base" body="Through x402.org — the rail agent marketplaces pay upstream on." price="$0.001 USDC / verdict" />
          </div>
        </div>
      </section>

      <section id="receipt" className="dots section-tight">
        <div className="wrap grid-2">
          <pre className="glass mono" style={{ margin: 0, padding: "clamp(16px, 2vw, 28px)", fontSize: "clamp(11px, 1vw, 13px)", lineHeight: 1.75, color: "var(--ink-2)", overflowX: "auto" }}>{`{
  "agentRegistry": "eip155:84532:0x8004A818…BD9e",
  "agentId": 9200,
  "clientAddress": "eip155:84532:0xE927…C040",
  "value": 100,
  "tag1": "assay", "tag2": "paid-check",
  "proofOfPayment": {
    "fromAddress": "0.0.10417423",
    "toAddress":   "0.0.10417408",
    "chainId":     "296",
    "txHash":      `}<span style={{ color: "var(--gold)" }}>{`"0.0.7162784@1788863425.370033840"`}</span>{`
  }
}`}</pre>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="eyebrow">03 · The receipt</div>
            <h2 className="h-display t-h2">Reviews are free to write. <span className="serif">That&apos;s why they&apos;re worthless.</span></h2>
            <p className="t-lead" style={{ maxWidth: 520 }}>After an agent pays through Assay, it writes the one review that can&apos;t be faked — ERC-8004 feedback whose file carries the settlement as proof of payment. A good agent earns its way to VERIFIED. A farm can&apos;t buy its way there for pocket change.</p>
            <div className="mono" style={{ fontSize: 12, lineHeight: 1.7, color: "var(--ink-4)" }}>99.4% of ERC-8004 feedback carries no proof of payment — arXiv:2606.26028</div>
          </div>
        </div>
      </section>

      <section id="ledger" className="dots section-tight">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="eyebrow">04 · The ledger</div>
              <h2 className="h-display t-h2">Watch an agent <span className="serif">pay.</span></h2>
            </div>
            <a href="/trail" className="pill">Full ledger</a>
          </div>
          <p className="t-lead" style={{ maxWidth: 620 }}>No database. Every settlement and every human approval is a message on one Hedera Consensus Service topic, read here from the public mirror node. Click a row to open it on HashScan.</p>
          <Trail limit={6} />
        </div>
      </section>

      <footer className="dots footer">
        <div className="wrap">
          <div className="footer-top">
            <div className="footer-col" style={{ gap: 14 }}>
              <div className="wordmark"><Mark /><span>ASSAY</span></div>
              <p className="t-lead" style={{ maxWidth: 380, fontSize: 15 }}>A paid pre-flight for agent payments. Reads reputation live, refuses to guess, writes the receipt.</p>
            </div>
            <div className="footer-col">
              <div className="eyebrow">Product</div>
              <a href="/#console">Console</a><a href="/architecture">Architecture</a><a href="/api/openapi">OpenAPI 3.1</a><a href="/api/mcp">MCP endpoint</a>
            </div>
            <div className="footer-col">
              <div className="eyebrow">Rails</div>
              <a href="https://hashscan.io/testnet/topic/0.0.10419050">HCS receipt topic</a><a href="https://sepolia.basescan.org/address/0x8004A818BFB912233c491871b3d84c89A494BD9e">ERC-8004 · Base Sepolia</a><a href="https://github.com/0xvikram/assay">Source on GitHub</a>
            </div>
          </div>
          <div className="footer-mark-row" aria-hidden="true"><span>ASSAY</span></div>
          <div className="footer-meta mono"><span>ETHOnline 2026 · built solo</span><span>Every number on this page is a live result.</span></div>
        </div>
      </footer>
    </main>
  );
}

function Stat({ n, k }: { n: string; k: string }) {
  return (
    <div>
      <div style={{ fontSize: "clamp(24px, 2.4vw, 32px)", fontWeight: 400, letterSpacing: "-0.02em" }}>{n}</div>
      <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em" }}>{k}</div>
    </div>
  );
}

function Verdict({ color, name, body }: { color: string; name: string; body: string }) {
  return (
    <div className="glass glass-lift" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "clamp(20px, 2vw, 28px)" }}>
      <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", color, wordBreak: "break-word" }}>{name}</div>
      <div style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 300, color: "var(--ink-2)" }}>{body}</div>
    </div>
  );
}

function Rail({ net, name, body, price }: { net: string; name: string; body: string; price: string }) {
  return (
    <div className="glass glass-lift" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "clamp(20px, 2vw, 28px)" }}>
      <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "none" }}>{net}</div>
      <div style={{ fontSize: 26, fontWeight: 400, letterSpacing: "-0.02em" }}>{name}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 300, color: "var(--ink-2)" }}>{body}</div>
      <div className="mono" style={{ marginTop: 6, fontSize: 13, color: "var(--gold)" }}>{price}</div>
    </div>
  );
}
