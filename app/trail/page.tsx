import Nav from "../components/Nav";
import Trail from "../components/Trail";

export const metadata = { title: "Assay — the ledger" };

export default function TrailPage() {
  return (
    <main className="dots" style={{ minHeight: "100vh" }}>
      <Nav />
      <div className="wrap" style={{ paddingTop: 24, paddingBottom: 96, display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="eyebrow">05 · The ledger</div>
        <h1 className="h-display t-h2">Every paid call, every human approval, <span className="serif">on a public ledger.</span></h1>
        <p className="t-lead" style={{ maxWidth: 620 }}>Assay keeps no database. Receipts and approvals are messages on one Hedera Consensus Service topic, read back here from the mirror node — the same way anyone else can read them.</p>
        <Trail limit={50} />
      </div>
    </main>
  );
}
