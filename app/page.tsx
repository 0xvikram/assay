const EXAMPLES: [string, string][] = [
  ["base:25975", "the #1 agent on Base by review count — a farm"],
  ["ethereum:14645", "100 distinct reviewers, 97% in one burst — a sybil farm"],
  ["ethereum:6888", "Minara AI — honest, unproven, with a path"],
];

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Assay</h1>
      <p style={{ marginTop: "0.5rem", opacity: 0.8 }}>
        Before your agent pays another agent, ask whether that agent&apos;s reputation is real.
        Every answer names the subgraph deployment and block it was read at, or is refused.
      </p>
      <h2 style={{ fontSize: "1rem", marginTop: "2.5rem" }}>Try it</h2>
      <ul style={{ paddingLeft: "1.2rem" }}>
        {EXAMPLES.map(([ref, why]) => {
          const [chain, id] = ref.split(":");
          return (
            <li key={ref} style={{ marginBottom: "0.5rem" }}>
              <a href={`/api/v1/agents/${chain}/${id}`}>{ref}</a> <span style={{ opacity: 0.7 }}>— {why}</span>
            </li>
          );
        })}
        <li style={{ marginBottom: "0.5rem" }}>
          <a href="/api/v1/resolve?url=https://mcp.zyf.ai">resolve https://mcp.zyf.ai</a> <span style={{ opacity: 0.7 }}>— which agents claim this endpoint?</span>
        </li>
        <li><a href="/api/openapi">OpenAPI 3.1</a> · <a href="/api/v1/chains">chains</a> · <a href="/api/healthz">health</a></li>
      </ul>
      <p style={{ marginTop: "2.5rem", fontSize: "0.85rem", opacity: 0.7 }}>
        Free routes are limited to 10 requests a minute. Paid routes over x402 arrive in the next phase.
      </p>
    </main>
  );
}
