import Nav from "./components/Nav";
import Console from "./components/Console";

export default function Home() {
  return (
    <main>
      <section style={{ position: "relative", minHeight: 900, backgroundColor: "var(--bg)", backgroundImage: "url(/temple.jpg)", backgroundSize: "cover", backgroundPosition: "center 40%", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,10,140,0.55) 0%, rgba(10,10,140,0) 30%, rgba(10,10,140,0) 55%, rgba(10,10,140,0.94) 100%)" }} />
        <Nav />
        <div className="hero-bottom fade-in" style={{ position: "absolute", left: 48, right: 48, bottom: 64, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 900 }}>
            <div className="eyebrow">ERC-8004 · read live from The Graph · sold over x402</div>
            <h1 className="h-display hero-h1" style={{ fontSize: 92, fontWeight: 400, letterSpacing: "-0.035em", lineHeight: 0.98 }}>
              Know who you&apos;re paying <span className="serif hero-serif" style={{ fontSize: 100 }}>before</span> you pay them.
            </h1>
            <p style={{ margin: 0, maxWidth: 560, fontSize: 18, lineHeight: 1.5, fontWeight: 300, color: "var(--ink-2)" }}>
              Assay reads an agent&apos;s reputation as it stands on-chain, tells you whether it&apos;s real, and refuses to guess.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 }}>
            <a href="#console" className="pill pill-solid" style={{ padding: "18px 28px", fontSize: 16 }}>
              <span>Check an agent</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>
            </a>
            <div className="mono" style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--ink-3)" }}>free preview · evidence from $0.001</div>
          </div>
        </div>
      </section>

      <section id="console" className="dots grid-2" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)", gap: 72, alignItems: "start", padding: "140px 48px 120px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div className="eyebrow">01 · The problem</div>
          <h2 className="h-display" style={{ fontSize: 56 }}>The most-reviewed agent on Base is <span className="serif" style={{ fontSize: 62 }}>a farm.</span></h2>
          <p style={{ margin: 0, maxWidth: 520, fontSize: 17, lineHeight: 1.55, fontWeight: 300, color: "var(--ink-2)" }}>
            309,734 reviews. Ninety-five percent from one wallet, every score identical, all inside one day, none backed by a payment. Any agent ranking by reputation would pick it first.
          </p>
          <div style={{ display: "flex", gap: 40, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
            <Stat n="95.5%" k="one wallet" /><Stat n="100%" k="one day" /><Stat n="0" k="payment-backed" />
          </div>
        </div>
        <Console />
      </section>

      <section id="rails" className="dots" style={{ padding: "0 48px 120px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 48, marginBottom: 36, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="eyebrow">02 · One 402, three rails</div>
            <h2 className="h-display" style={{ fontSize: 48 }}>The client picks the rail <span className="serif" style={{ fontSize: 54 }}>it can pay on.</span></h2>
          </div>
          <div className="mono" style={{ maxWidth: 360, fontSize: 12, lineHeight: 1.7, color: "var(--ink-3)" }}>same engine · same tiers · every settlement leaves a receipt on Hedera Consensus Service</div>
        </div>
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18 }}>
          <Rail net="hedera:testnet" name="Hedera" body="Blocky402 verifies and settles; the facilitator pays the network fee." price="1,000,000 tinybar / verdict" />
          <Rail net="eip155:5042002" name="Arc" body="Signed off-chain, batched by Circle Gateway. No gas." price="$0.001 USDC / verdict" />
          <Rail net="eip155:84532" name="Base" body="Through x402.org — the rail agent marketplaces pay upstream on." price="$0.001 USDC / verdict" />
        </div>
      </section>

      <section id="receipt" className="dots grid-2" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)", gap: 72, alignItems: "center", padding: "0 48px 140px" }}>
        <pre className="glass mono" style={{ margin: 0, padding: 28, fontSize: 13, lineHeight: 1.75, color: "var(--ink-2)", overflowX: "auto" }}>{`{
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
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div className="eyebrow">03 · The receipt</div>
          <h2 className="h-display" style={{ fontSize: 52 }}>Reviews are free to write. <span className="serif" style={{ fontSize: 58 }}>That&apos;s why they&apos;re worthless.</span></h2>
          <p style={{ margin: 0, maxWidth: 520, fontSize: 17, lineHeight: 1.55, fontWeight: 300, color: "var(--ink-2)" }}>
            After an agent pays through Assay, it writes the one review that can&apos;t be faked — ERC-8004 feedback whose file carries the settlement as proof of payment. A good agent earns its way to VERIFIED. A farm can&apos;t buy its way there for pocket change.
          </p>
          <div className="mono" style={{ fontSize: 12, lineHeight: 1.7, color: "var(--ink-4)" }}>99.4% of ERC-8004 feedback carries no proof of payment — arXiv:2606.26028</div>
        </div>
      </section>

      <footer className="dots" style={{ position: "relative", height: 420, overflow: "hidden", borderTop: "1px solid var(--line)" }}>
        <div className="mono" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, padding: "36px 48px 0", fontSize: 12, letterSpacing: "0.06em", color: "var(--ink-3)" }}>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <a href="/api/openapi">/api/openapi</a><a href="/api/mcp">/api/mcp</a><a href="/architecture">/architecture</a><a href="https://github.com/0xvikram/assay">github.com/0xvikram/assay</a>
          </div>
          <span>ETHOnline 2026</span>
        </div>
        <div className="footer-mark" aria-hidden="true" style={{ position: "absolute", left: 40, bottom: -70, fontSize: 380, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.06em", color: "var(--ink)", opacity: 0.96, userSelect: "none" }}>ASSAY</div>
      </footer>
    </main>
  );
}

function Stat({ n, k }: { n: string; k: string }) {
  return (
    <div>
      <div style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.02em" }}>{n}</div>
      <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em" }}>{k}</div>
    </div>
  );
}

function Rail({ net, name, body, price }: { net: string; name: string; body: string; price: string }) {
  return (
    <div className="glass glass-lift" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 28 }}>
      <div className="eyebrow" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "none" }}>{net}</div>
      <div style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.02em" }}>{name}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 300, color: "var(--ink-2)" }}>{body}</div>
      <div className="mono" style={{ marginTop: 8, fontSize: 13, color: "var(--gold)" }}>{price}</div>
    </div>
  );
}
