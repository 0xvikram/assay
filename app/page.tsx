import Console from "./components/Console";

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Assay</h1>
      <p style={{ marginTop: "0.5rem", opacity: 0.8 }}>
        Before your agent pays another agent, ask whether that agent&apos;s reputation is real.
        Every answer names the subgraph deployment and block it was read at, or is refused.
      </p>
      <Console />
      <p style={{ marginTop: "2.5rem", fontSize: "0.85rem", opacity: 0.7 }}>
        The preview is free (10/min per IP). The full report — evidence, what would change the verdict, provenance — is sold
        to agents over x402 on Hedera. <a href="/architecture">Architecture</a> · <a href="/api/openapi">OpenAPI</a> ·{" "}
        <a href="https://github.com/0xvikram/assay">source</a>
      </p>
    </main>
  );
}
