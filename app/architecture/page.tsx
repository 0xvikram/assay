export const metadata = { title: "Assay — architecture" };

/**
 * The diagram Arc asks for, as a page rather than an attachment, so the
 * submission link and the running service are the same thing. The SVG in
 * public/ is the file to hand in; docs/ARCHITECTURE.md carries the prose.
 */
export default function Architecture() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "2.5rem 1.5rem", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Architecture</h1>
      <p style={{ opacity: 0.8, marginTop: "0.5rem" }}>
        One engine, two doors, one ledger. Brass is money moving; ink is data moving; dotted is verify / settle.
      </p>
      <div style={{ overflowX: "auto", marginTop: "1.5rem", border: "1px solid #0F2226", borderRadius: 8, background: "#EFEFEA" }}>
        <img src="/architecture.svg" alt="Assay architecture: paying agent → Assay (REST + MCP over one engine) → The Graph; Blocky402 verify/settle → HCS receipts; the receipt written to the ERC-8004 Reputation Registry on Base Sepolia with the file on IPFS" style={{ display: "block", minWidth: 900, width: "100%" }} />
      </div>
      <h2 style={{ fontSize: "1rem", marginTop: "2rem" }}>Read path</h2>
      <ol style={{ paddingLeft: "1.2rem" }}>
        <li>Agent asks; the route answers <code>402</code> with x402 requirements on <code>hedera:testnet</code>, priced by the work the route does.</li>
        <li>Agent signs, retries. Blocky402 verifies; the handler runs; settlement happens <em>only</em> on success.</li>
        <li>The engine reads the Agent0 subgraph with <code>_meta</code>. No pinned deployment and block, no answer.</li>
        <li>Eleven detectors → verdict, evidence, and what would change it. Confidence only from payment-backed independent reviews.</li>
        <li>A receipt lands on the HCS topic. The topic, read via the mirror node, is the whole memory. No database.</li>
      </ol>
      <h2 style={{ fontSize: "1rem", marginTop: "1.5rem" }}>Write path — the receipt</h2>
      <p>
        After paying, the agent writes ERC-8004 feedback about Assay on Base Sepolia whose file carries
        <code> proofOfPayment</code> with the Hedera settlement. The file is pinned to The Graph&apos;s IPFS node because the
        indexer reads feedback only through <code>file/ipfs</code>. The next read of Assay shows a review that cost what the work cost.
      </p>
      <p style={{ opacity: 0.7, fontSize: "0.85rem" }}>
        Prose and the Mermaid source: <code>docs/ARCHITECTURE.md</code>. File: <a href="/architecture.svg">/architecture.svg</a>.
      </p>
    </main>
  );
}
