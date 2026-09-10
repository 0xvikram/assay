import PageHead from "../components/PageHead";
import Footer from "../components/Footer";

export const metadata = { title: "Assay — architecture" };

/**
 * The diagram Arc asks for, as a page rather than an attachment, so the
 * submission link and the running service are the same thing. The SVG in
 * public/ is the file to hand in; docs/ARCHITECTURE.md carries the prose.
 */
export default function Architecture() {
  return (
    <main>
      <PageHead
        art="/brand/columns.webp"
        eyebrow="Architecture"
        title={<>One engine, two doors, <span className="serif">one ledger.</span></>}
        lead="Cobalt is money moving; ink is data moving; dashed is verify and settle."
      />
      <div className="wrap page-body">
        <div className="glass" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", padding: 10 }}>
          <p className="mono" style={{ margin: "4px 8px 10px", fontSize: 11, color: "var(--ink-4)" }}>scroll the diagram sideways ↔</p>
          <img src="/architecture-marble.svg" alt="Assay architecture: paying agent → Assay (REST + MCP over one engine) → The Graph; Blocky402 verify/settle → HCS receipts; the receipt written to the ERC-8004 Reputation Registry on Base Sepolia with the file on IPFS" style={{ display: "block", minWidth: 780, width: "100%", borderRadius: 12 }} />
        </div>
        <div className="grid-2" style={{ alignItems: "start", marginTop: "clamp(40px, 5vw, 64px)" }}>
          <div className="prose">
            <div className="eyebrow">Read path</div>
            <ol style={{ paddingLeft: "1.2rem" }}>
              <li>An agent asks; the route answers <code>402</code> with x402 requirements on three rails, priced by the work the route does.</li>
              <li>The agent signs and retries. The facilitator verifies; the handler runs; settlement happens <em>only</em> on success.</li>
              <li>The engine reads the Agent0 subgraph with <code>_meta</code>. No pinned deployment and block, no answer.</li>
              <li>Named findings → a verdict, the evidence, and what would change it. Confidence only from payment-backed, independent reviews.</li>
              <li>A receipt lands on the HCS topic. The topic, read through the mirror node, is the whole memory. No database.</li>
            </ol>
          </div>
          <div className="prose">
            <div className="eyebrow">Write path — the receipt</div>
            <p>After paying, the agent writes ERC-8004 feedback about Assay on Base Sepolia whose file carries <code>proofOfPayment</code> with the settlement. The file is pinned to The Graph&apos;s IPFS node because the indexer reads feedback only through <code>file/ipfs</code>. The next read of Assay shows a review that cost what the work cost.</p>
            <p>Where Assay finds a farm, it appends a response to the fake reviews themselves — permissionless in ERC-8004 — so the finding sits in the registry beside the reviews it is about.</p>
            <p className="mono" style={{ color: "var(--ink-4)", fontSize: 12 }}>Prose and the Mermaid source: docs/ARCHITECTURE.md · file: <a href="/architecture.svg">/architecture.svg</a></p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
