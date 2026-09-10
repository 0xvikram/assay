import { query } from "./client";
import type { ChainEntry } from "./registry";
import type { GraphResult } from "./client";

export interface RawFeedback {
  id: string;
  clientAddress: string;
  value: string | null;
  tag1: string | null;
  tag2: string | null;
  isRevoked: boolean;
  createdAt: string;
  feedbackFile: {
    proofOfPaymentTxHash: string | null;
    proofOfPaymentChainId: string | null;
    proofOfPaymentFromAddress: string | null;
    proofOfPaymentToAddress: string | null;
    mcpTool: string | null;
    text: string | null;
  } | null;
}

export interface RawValidation {
  id: string;
  validatorAddress: string;
  response: number | null;
  status: string;
  tag: string | null;
  createdAt: string;
}

export interface RawAgent {
  id: string;
  chainId: string;
  agentId: string;
  owner: string;
  agentWallet: string | null;
  createdAt: string;
  lastActivity: string | null;
  totalFeedback: string | null;
  registrationFile: {
    name: string | null;
    description: string | null;
    active: boolean | null;
    x402Support: boolean | null;
    supportedTrusts: string[] | null;
    mcpEndpoint: string | null;
    mcpTools: string[] | null;
    a2aEndpoint: string | null;
    webEndpoint: string | null;
    ens: string | null;
    did: string | null;
  } | null;
  validations: RawValidation[];
  feedback: RawFeedback[];
}

const AGENT_BODY = `
  agent(id: $id) {
    id chainId agentId owner agentWallet createdAt lastActivity totalFeedback
    registrationFile {
      name description active x402Support supportedTrusts
      mcpEndpoint mcpTools a2aEndpoint webEndpoint ens did
    }
    validations(first: 100, orderBy: createdAt, orderDirection: desc) {
      id validatorAddress response status tag createdAt
    }
    feedback(first: $first, orderBy: createdAt, orderDirection: desc) {
      id clientAddress value tag1 tag2 isRevoked createdAt
      feedbackFile {
        proofOfPaymentTxHash proofOfPaymentChainId proofOfPaymentFromAddress proofOfPaymentToAddress mcpTool text
      }
    }
  }`;

export function fetchAgent(
  chain: ChainEntry,
  agentId: string,
  sampleSize = 1000,
): Promise<GraphResult<{ agent: RawAgent | null }>> {
  const id = agentId.includes(":") ? agentId : `${chain.chainId}:${agentId}`;
  return query<{ agent: RawAgent | null }>(chain, AGENT_BODY, { id, first: sampleSize });
}

/** The slice of an agent needed to match it to another, without pulling its feedback. */
export interface AgentStub {
  id: string;
  agentId: string;
  chainId: string;
  owner: string;
  registrationFile: {
    name: string | null;
    ens: string | null;
    mcpEndpoint: string | null;
    webEndpoint: string | null;
    a2aEndpoint: string | null;
  } | null;
}

const STUB = `id agentId chainId owner registrationFile { name ens mcpEndpoint webEndpoint a2aEndpoint }`;

/**
 * A registration file has no back-reference to its agent in this schema, so the
 * lookup goes through a nested filter on `agents`. Candidates are the spellings
 * an endpoint may have been registered under; the match is exact per spelling.
 */
export function fetchAgentsByEndpoint(chain: ChainEntry, candidates: string[]) {
  return query<{ agents: AgentStub[] }>(
    chain,
    `agents(first: 20, where: { or: [
       { registrationFile_: { mcpEndpoint_in: $urls } },
       { registrationFile_: { webEndpoint_in: $urls } },
       { registrationFile_: { a2aEndpoint_in: $urls } }
     ] }) { ${STUB} }`,
    { urls: candidates },
    "$urls: [String!]!",
  );
}

/**
 * Agents at an address, as owner or declared wallet. A 402 names who gets paid;
 * this is how that address becomes an identity with a reputation.
 */
export function fetchAgentsByAddress(chain: ChainEntry, address: string) {
  return query<{ agents: AgentStub[] }>(
    chain,
    `agents(first: 20, where: { or: [{ owner: $a }, { agentWallet: $a }] }, orderBy: createdAt, orderDirection: asc) { ${STUB} }`,
    { a: address.toLowerCase() },
    "$a: Bytes!",
  );
}

export function fetchAgentsByOwner(chain: ChainEntry, owner: string) {
  return query<{ agents: AgentStub[] }>(
    chain,
    `agents(first: 20, where: { owner: $owner }, orderBy: createdAt, orderDirection: asc) { ${STUB} }`,
    { owner: owner.toLowerCase() },
    "$owner: Bytes!",
  );
}
