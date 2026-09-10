import Nav from "../components/Nav";

export const metadata = { title: "Assay — architecture" };

/**
 * The diagram Arc asks for, as a page rather than an attachment, so the
 * submission link and the running service are the same thing. The SVG in
 * public/ is the file to hand in; docs/ARCHITECTURE.md carries the prose.
 */
export default function Architecture() {
  return (
    <main className="dots" style={{ minHeight: "100vh" }}>
      <Nav />
      <div className="wrap" style={{ paddingTop: 24, paddingBottom: 96, lineHeight: 1.5 }}>
      <div className="eyebrow">Architecture</div>
      <h1 className="h-display t-h2" style={{ marginTop: 12 }}>One engine, two doors, <span className="serif">one ledger.</span></h1>
      <p className="t-lead" style={{ marginTop: "0.5rem", maxWidth: 620 }}>
        Brass is money moving; ink is data moving; dotted is verify / settle.
      </p>
      <div className="glass" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginTop: "1.5rem", padding: 8 }}>
        <p className="mono" style={{ margin: "4px 8px 10px", fontSize: 11, color: "var(--ink-4)" }}>scroll the diagram sideways ↔</p>
        <img src="/architecture-dark.svg" alt="Assay architecture: paying agent → Assay (REST + MCP over one engine) → The Graph; Blocky402 verify/settle → HCS receipts; the receipt written to the ERC-8004 Reputation Registry on Base Sepolia with the file on IPFS" style={{ display: "block", minWidth: 780, width: "100%" }} />
      </div>
      <h2 className="eyebrow" style={{ marginTop: "2.5rem" }}>Read path</h2>
      <ol style={{ paddingLeft: "1.2rem", color: "var(--ink-2)", fontWeight: 300 }}>
        <li>Agent asks; the route answers <code>402</code> with x402 requirements on <code>hedera:testnet</code>, priced by the work the route does.</li>
        <li>Agent signs, retries. Blocky402 verifies; the handler runs; settlement happens <em>only</em> on success.</li>
        <li>The engine reads the Agent0 subgraph with <code>_meta</code>. No pinned deployment and block, no answer.</li>
        <li>Thirteen named findings → verdict, evidence, and what would change it. Confidence only from payment-backed independent reviews.</li>
        <li>A receipt lands on the HCS topic. The topic, read via the mirror node, is the whole memory. No database.</li>
      </ol>
      <h2 className="eyebrow" style={{ marginTop: "2rem" }}>Write path — the receipt</h2>
      <p style={{ color: "var(--ink-2)", fontWeight: 300 }}>
        After paying, the agent writes ERC-8004 feedback about Assay on Base Sepolia whose file carries
        <code> proofOfPayment</code> with the Hedera settlement. The file is pinned to The Graph&apos;s IPFS node because the
        indexer reads feedback only through <code>file/ipfs</code>. The next read of Assay shows a review that cost what the work cost.
      </p>
      <p className="mono" style={{ color: "var(--ink-4)", fontSize: 12 }}>
        Prose and the Mermaid source: docs/ARCHITECTURE.md · file: <a href="/architecture.svg">/architecture.svg</a>
      </p>
      </div>
    </main>
  );
}
