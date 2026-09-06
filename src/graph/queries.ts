import { query } from "./client.js";
import type { ChainEntry } from "./registry.js";
import type { GraphResult } from "./client.js";

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
        proofOfPaymentTxHash proofOfPaymentChainId proofOfPaymentFromAddress mcpTool text
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
