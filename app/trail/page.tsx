import PageHead from "../components/PageHead";
import Trail from "../components/Trail";
import Footer from "../components/Footer";

export const metadata = { title: "Assay — the ledger" };

export default function TrailPage() {
  return (
    <main>
      <PageHead
        art="/brand/temple.webp"
        eyebrow="06 · The ledger"
        title={<>Every paid call, every human approval, <span className="serif">on a public ledger.</span></>}
        lead="Assay keeps no database. Receipts, refusals and approvals are messages on one Hedera Consensus Service topic, read back here from the mirror node — the same way anyone else can read them."
      />
      <div className="wrap page-body"><Trail limit={50} /></div>
      <Footer />
    </main>
  );
}
