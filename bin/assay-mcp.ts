#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools, type Wrap } from "../src/mcp/tools";

/**
 * The local transport for Claude Desktop, Claude Code and Cursor. It runs on
 * the judge's machine against their own Graph key, so nothing here is paid —
 * the compute is theirs. The hosted /api/mcp endpoint is where tools cost.
 */
const free: Wrap = (h) => h;
const server = new McpServer({ name: "assay", version: "0.1.0" });
registerTools(server, { agent: free, resolve: free, corroborate: free }, "(free on this local transport; paid over x402 on the hosted endpoint)");
await server.connect(new StdioServerTransport());
