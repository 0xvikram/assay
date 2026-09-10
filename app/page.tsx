import Nav from "./components/Nav";
import Console from "./components/Console";
import Trail from "./components/Trail";
import Lending from "./components/Lending";
import RunExample from "./components/RunExample";
import HeroCheck from "./components/HeroCheck";
import Footer from "./components/Footer";
import { Arrow, Scales, Seal } from "./components/Art";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-art" aria-hidden="true">
          <img className="hero-head" src="/brand/hero-head.webp" alt="" fetchPriority="high" />
        </div>
        <Nav />
        <div className="hero-margin" aria-hidden="true">
          <span>ERC-8004<br />read live<br />from The Graph</span>
          <span>Sold over<br />x402 · on<br />three rails</span>
          <span>Trust<br />needs<br />proof</span>
        </div>
        <div className="hero-body wrap fade-in" style={{ width: "100%" }}>
          <div className="hero-copy">
            <div className="eyebrow">A paid pre-flight for agent payments</div>
            <h1 className="h-display t-hero">Know who you&apos;re paying <span className="serif">before</span> you pay them.</h1>
            <p className="t-lead" style={{ maxWidth: 470 }}>Assay reads an agent&apos;s reputation as it stands on-chain, tells you whether it&apos;s real, and refuses to guess.</p>
            <HeroCheck />
            <div className="mono" style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--ink-3)" }}>free preview · evidence from $0.001</div>
          </div>
        </div>
      </section>

      <section id="console" className="section">
        <div className="art art-columns" aria-hidden="true"><img src="/brand/columns.webp" alt="" loading="lazy" /></div>
        <div className="wrap">
          <div className="grid-2 indent">
            <div className="stack">
              <div className="eyebrow">01 · The problem</div>
              <h2 className="h-display t-h2">The most-reviewed agent on Base is <span className="serif">a farm.</span></h2>
              <p className="t-lead" style={{ maxWidth: 500 }}>309,734 reviews. Ninety-nine percent of the latest thousand from one wallet, every score identical, all inside one day, none backed by a payment. Any agent ranking by reputation would pick it first.</p>
              <div className="stats"><Stat n="99%" k="one wallet" /><Stat n="100%" k="one day" /><Stat n="0" k="payment-backed" /></div>
            </div>
            <Console />
          </div>
        </div>
      </section>

      <section id="verdicts" className="section-tight">
        <div className="wrap">
          <div className="center-head">
            <div className="eyebrow">02 · Three verdicts</div>
            <h2 className="h-display t-h2">Confidence is earned only from <span className="serif">payment-backed, independent reviews.</span></h2>
          </div>
          <div className="tablets">
            <Tablet color="var(--mint)" name="VERIFIED" body="Five or more reviews backed by verifiable on-chain payments, from at least three independent payers, none of them dominant. The closest anyone has come is Assay itself." example={{ target: "base-sepolia:9200", label: "read Assay itself" }} />
            <Tablet color="var(--gold)" name="UNPROVEN" body="Reputation exists, but nothing about it can be independently verified — or there is too little to judge. Not a punishment: every report ends with the priced path to VERIFIED." example={{ target: "ethereum:6888", label: "read ethereum:6888" }} />
            <Tablet color="var(--coral)" name="WASH_REPUTATION_DETECTED" body="The signal was manufactured: one address wrote most of it, the scores are identical and unpaid, it all landed in a day, or the agent paid itself." example={{ target: "ethereum:14645", label: "read ethereum:14645" }} />
          </div>
        </div>
      </section>

      <section id="composition" className="section-tight">
        <div className="wrap grid-2">
          <div className="stack">
            <div className="eyebrow">03 · Composition</div>
            <h2 className="h-display t-h2">Two subgraphs agreeing means nothing <span className="serif">until they agree on what the number is.</span></h2>
            <p className="t-lead" style={{ maxWidth: 500 }}>Messari versions that intent: <span className="mono">schemaVersion</span> says what the fields are, <span className="mono">methodologyVersion</span> says how they were derived. Assay re-reads both from every subgraph on every request and compares only when both match — otherwise it names the version that differed and returns no number at all.</p>
            <p className="t-lead" style={{ maxWidth: 500 }}>Eighteen sources across eight networks, and adding one is a row in <span className="mono">registry/lending.json</span>, never a code path.</p>
          </div>
          <Lending />
        </div>
      </section>

      <section id="rails" className="section-tight">
        <div className="wrap grid-2">
          <Scales />
          <div className="stack">
            <div className="eyebrow">04 · One 402, three rails</div>
            <h2 className="h-display t-h2">The client picks the rail <span className="serif">it can pay on.</span></h2>
            <p className="t-lead" style={{ maxWidth: 480 }}>Every paid answer offers all three; the client pays on whichever it holds. The same engine and the same prices sit behind each, and every settlement leaves a receipt on Hedera Consensus Service.</p>
            <div className="rail-tiles">
              <RailTile name="Hedera" net="hedera:testnet" body="Blocky402 settles; the facilitator pays the fee." price="0.01 ℏ / verdict" />
              <RailTile name="Arc" net="eip155:5042002" body="Signed off-chain, batched by Circle Gateway." price="$0.001 USDC" />
              <RailTile name="Base" net="eip155:84532" body="Through x402.org, the marketplace rail." price="$0.001 USDC" />
            </div>
          </div>
        </div>
      </section>

      <section id="receipt" className="section-tight">
        <div className="wrap grid-2">
          <div className="stack">
            <div className="eyebrow">05 · The receipt</div>
            <h2 className="h-display t-h2">Reviews are free to write. <span className="serif">That&apos;s why they&apos;re worthless.</span></h2>
            <p className="t-lead" style={{ maxWidth: 500 }}>After an agent pays through Assay, it writes the one review that can&apos;t be faked — ERC-8004 feedback whose file carries the settlement as proof of payment. A good agent earns its way to VERIFIED. A farm can&apos;t buy its way there for pocket change.</p>
            <p className="t-lead" style={{ maxWidth: 500 }}>And where Assay finds a farm, it says so on-chain: a response appended to the fake reviews themselves, where every reader of the registry will find it.</p>
            <div className="mono" style={{ fontSize: 12, lineHeight: 1.7, color: "var(--ink-3)" }}>99.4% of ERC-8004 feedback carries no proof of payment — arXiv:2606.26028</div>
          </div>
          <div className="ledger-book">
            <pre className="ledger-page"><span className="ledger-title">ASSAY LEDGER</span>{`{
  "agentRegistry": "eip155:84532:0x8004A818…BD9e",
  "agentId": 9200,
  "clientAddress": "eip155:84532:0xE927…C040",
  "value": 100,
  "tag1": "assay", "tag2": "paid-check",
  "proofOfPayment": {
    "fromAddress": "0.0.10417423",
    "toAddress":   "0.0.10417408",
    "chainId":     "296",
    "txHash":      `}<span style={{ color: "var(--cobalt)", fontWeight: 500 }}>{`"0.0.7162784@1788863425.370033840"`}</span>{`
  }
}`}</pre>
            <Seal className="ledger-seal" />
          </div>
        </div>
      </section>

      <section id="ledger" className="section-tight">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div className="stack" style={{ gap: 14 }}>
              <div className="eyebrow">06 · The ledger</div>
              <h2 className="h-display t-h2">Watch an agent <span className="serif">pay.</span></h2>
            </div>
            <a href="/trail" className="pill">Full ledger <Arrow size={14} /></a>
          </div>
          <p className="t-lead" style={{ maxWidth: 640 }}>No database. Every settlement, every refusal and every human approval is a message on one Hedera Consensus Service topic, read here from the public mirror node. Click a row to open it on-chain.</p>
          <Trail limit={6} />
        </div>
      </section>

      <section className="cta">
        <div className="cta-art" aria-hidden="true"><img src="/brand/eye.webp" alt="" loading="lazy" /></div>
        <div className="wrap" style={{ width: "100%" }}>
          <div className="cta-copy">
            <div className="eyebrow">Trust needs proof</div>
            <h2 className="h-display t-h2">Build with agents <span className="serif">you can trust.</span></h2>
            <p className="t-lead">One call before any payment — over REST, over MCP, or as a guard in front of your own x402 client that refuses to sign for a farm.</p>
            <a href="#console" className="pill pill-solid" style={{ padding: "14px 24px", fontSize: 15 }}><span>Check an agent</span><Arrow /></a>
            <div className="mono" style={{ fontSize: 12, letterSpacing: "0.06em", color: "var(--ink-3)" }}>free preview · evidence from $0.001</div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Stat({ n, k }: { n: string; k: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="stat-n">{n}</div>
      <div className="eyebrow" style={{ fontSize: 10.5, letterSpacing: "0.16em" }}>{k}</div>
    </div>
  );
}

function Tablet({ color, name, body, example }: { color: string; name: string; body: string; example: { target: string; label: string } }) {
  return (
    <div className="tablet">
      <div className="badge tablet-name" style={{ color }}>{name.replace(/_/g, " ")}</div>
      <div className="tablet-body">{body}</div>
      <RunExample target={example.target} label={example.label} />
    </div>
  );
}

function RailTile({ name, net, body, price }: { name: string; net: string; body: string; price: string }) {
  return (
    <div className="rail-tile">
      <div style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)" }}>{name}</div>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)", overflowWrap: "anywhere" }}>{net}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)" }}>{body}</div>
      <div className="mono" style={{ marginTop: "auto", paddingTop: 4, fontSize: 12.5, fontWeight: 500, color: "var(--cobalt)" }}>{price}</div>
    </div>
  );
}
