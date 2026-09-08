import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { assay, type AssayReport } from "../engine/assay";
import { resolveEndpoint } from "../engine/resolve";
import { corroborate } from "../engine/corroborate";
import { CHAINS, healthyChains } from "../engine/graph/registry";
import { THRESHOLDS } from "../engine/score/verdict";

type ToolResult = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };
type Handler<A> = (args: A) => Promise<ToolResult>;
/** Identity on stdio; `createPaymentWrapper(...)` on the hosted transport. */
export type Wrap = <A extends Record<string, unknown>>(h: Handler<A>) => Handler<A>;

/** Every answer ends the same way, so a model quoting it carries the provenance along. */
function provenanceLine(r: AssayReport) {
  return `Read from ${r.provenance.chain} subgraph deployment ${r.provenance.deployment} at block ${r.provenance.block}${r.provenance.sampleTruncated ? ` (sample capped at ${r.provenance.sampleCap})` : ""}.`;
}

function summarise(r: AssayReport) {
  const lines = [
    `${r.agent.name ?? "(unnamed agent)"} ${r.agent.id}: ${r.assessment.verdict}, confidence ${r.assessment.confidence}/100.`,
    r.assessment.headline,
    ...r.assessment.findings.filter((f) => f.severity !== "info").map((f) => `- ${f.statement} (${f.measured})`),
  ];
  if (r.assessment.nextSteps.length) lines.push(`To reach VERIFIED: ${r.assessment.nextSteps.join(" ")}`);
  lines.push(provenanceLine(r));
  return lines.join("\n");
}

const ok = (text: string, structuredContent?: Record<string, unknown>): ToolResult =>
  ({ content: [{ type: "text", text }], ...(structuredContent ? { structuredContent } : {}) });
const fail = (err: unknown): ToolResult =>
  ({ content: [{ type: "text", text: `Refused: ${(err as Error).message}` }], isError: true });

const ref = { chain: z.string().describe("Registry key (base, ethereum, bsc, polygon, base-sepolia, bsc-chapel) or numeric chain id"), agentId: z.string().describe("ERC-8004 agent id on that chain") };

/**
 * One tool set, two transports. `paid` wraps the tools that cost real work;
 * discovery stays free so an agent can find out what a verdict would cost
 * before deciding to buy one.
 */
export function registerTools(server: McpServer, paid: { agent: Wrap; resolve: Wrap; corroborate: Wrap }, note: string) {
  server.tool(
    "assay_agent",
    `Is this ERC-8004 agent's reputation real? Full verdict (VERIFIED / UNPROVEN / WASH_REPUTATION_DETECTED) with the evidence, what would change it, and the exact subgraph deployment and block it was read at. ${note}`,
    ref,
    paid.agent(async ({ chain, agentId }: { chain: string; agentId: string }) => {
      try { const r = await assay(`${chain}:${agentId}`); return ok(summarise(r), r as unknown as Record<string, unknown>); }
      catch (err) { return fail(err); }
    }),
  );

  server.tool(
    "assay_preview",
    "Free: verdict and confidence only, with the deployment and block. Enough to decide whether the full report is worth buying.",
    ref,
    async ({ chain, agentId }) => {
      try {
        const r = await assay(`${chain}:${agentId}`);
        return ok(`${r.agent.id}: ${r.assessment.verdict}, confidence ${r.assessment.confidence}/100. ${provenanceLine(r)}`,
          { agent: r.agent.id, verdict: r.assessment.verdict, confidence: r.assessment.confidence, deployment: r.provenance.deployment, block: r.provenance.block });
      } catch (err) { return fail(err); }
    },
  );

  server.tool(
    "assay_resolve",
    `Which registered agents claim this endpoint URL? Searches every healthy chain. ${note}`,
    { url: z.string().url().describe("An mcpEndpoint, webEndpoint or a2aEndpoint as registered") },
    paid.resolve(async ({ url }: { url: string }) => {
      try {
        const r = await resolveEndpoint(url);
        const lines = r.matches.map((m) => `- ${m.chain.key}:${m.agent.agentId} ${m.agent.registrationFile?.name ?? "(unnamed)"} via ${m.matchedOn}`);
        const head = r.matches.length ? `${r.matches.length} agent(s) claim ${url}:` : `No registered agent claims ${url}.`;
        const tail = r.truncated.length ? `More than 20 on ${r.truncated.join(", ")} — one endpoint, many registrations; identity is the agent id, not the URL.` : "";
        return ok([head, ...lines, tail].filter(Boolean).join("\n"), { ...r, matches: r.matches.map((m) => ({ chain: m.chain.key, agent: m.agent, matchedOn: m.matchedOn })) });
      } catch (err) { return fail(err); }
    }),
  );

  server.tool(
    "assay_corroborate",
    `The same owner across every healthy chain, each agent assessed. Flags CROSS_CHAIN_INCONSISTENT and OWNER_RUNS_WASHED_AGENT. ${note}`,
    { ref: z.string().describe("Owner address or chain:agentId") },
    paid.corroborate(async ({ ref: r }: { ref: string }) => {
      try {
        const c = await corroborate(r);
        const lines = c.chains.flatMap((p) => p.agents.map((a) => `- ${a.id} ${a.name ?? "(unnamed)"}: ${a.verdict ?? a.error}`));
        const findings = c.findings.map((f) => `! ${f.statement} (${f.measured})`);
        return ok([`${c.owner} is present on ${c.chains.length} of ${c.chainsQueried.length} chains.`, ...lines, ...findings].join("\n"), c as unknown as Record<string, unknown>);
      } catch (err) { return fail(err); }
    }),
  );

  server.tool("assay_chains", "Free: the chain registry with health flags.", {}, async () =>
    ok(`${healthyChains().length} healthy of ${CHAINS.length} registered: ${CHAINS.map((c) => `${c.key}${c.healthy ? "" : " (unhealthy, refused)"}`).join(", ")}.`, { chains: CHAINS }));

  server.tool("assay_thresholds", "Free: the rules every verdict is computed under. A score whose rules are hidden is the problem this service exists to fix.", {}, async () =>
    ok(Object.entries(THRESHOLDS).map(([k, v]) => `${k} = ${v}`).join("\n"), { thresholds: THRESHOLDS }));
}
