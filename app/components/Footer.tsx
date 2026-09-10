import { Mark } from "./Art";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-col" style={{ gap: 14 }}>
            <div className="wordmark"><Mark /><span>ASSAY</span></div>
            <p className="t-lead" style={{ maxWidth: 380, fontSize: 15 }}>Trust needs proof. A paid pre-flight for agent payments — reads reputation live, refuses to guess, writes the receipt.</p>
          </div>
          <div className="footer-col">
            <div className="eyebrow">Product</div>
            <a href="/#console">Console</a><a href="/trail">Ledger</a><a href="/escalate">Step-up</a><a href="/architecture">Architecture</a><a href="/api/openapi">OpenAPI 3.1</a><a href="/api/mcp">MCP endpoint</a>
          </div>
          <div className="footer-col">
            <div className="eyebrow">On-chain</div>
            <a href="https://hashscan.io/testnet/topic/0.0.10419050">HCS receipt topic</a><a href="https://sepolia.basescan.org/address/0x8004A818BFB912233c491871b3d84c89A494BD9e">ERC-8004 · Base Sepolia</a><a href="https://github.com/0xvikram/assay">Source on GitHub</a>
          </div>
        </div>
        <div className="footer-mark-row" aria-hidden="true"><span>Assay</span></div>
        <div className="footer-meta mono"><span>ETHOnline 2026 · built solo</span><span>Sculpture: The Metropolitan Museum of Art, Open Access (CC0)</span></div>
      </div>
    </footer>
  );
}
