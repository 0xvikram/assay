import type { NextConfig } from "next";

/** Optional Privy dependencies the dashboard never uses; see src/stubs/privy-optional.ts. */
const PRIVY_OPTIONAL = [
  "@abstract-foundation/agw-client",
  "@abstract-foundation/agw-client/actions",
  "permissionless",
  "permissionless/accounts",
  "permissionless/clients/pimlico",
  "@solana-program/memo",
  "@solana-program/system",
  "x402/client",
];

const config: NextConfig = {
  // The engine reads its registry and fixtures from disk. Serverless bundles
  // only what the tracer sees imported, so name the files explicitly — for the
  // API and for the agent pages, which call the engine while rendering.
  outputFileTracingIncludes: {
    "/api/**": ["./registry/**", "./fixtures/**"],
    "/agent/**": ["./registry/**"],
  },
  turbopack: {
    resolveAlias: Object.fromEntries(PRIVY_OPTIONAL.map((m) => [m, "./src/stubs/privy-optional.ts"])),
  },
  poweredByHeader: false,
};

export default config;
