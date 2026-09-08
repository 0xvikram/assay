import type { NextConfig } from "next";

const config: NextConfig = {
  // The engine reads its registry and fixtures from disk. Serverless bundles
  // only what the tracer sees imported, so name the files explicitly.
  outputFileTracingIncludes: {
    "/api/**": ["./registry/**", "./fixtures/**"],
  },
  poweredByHeader: false,
};

export default config;
