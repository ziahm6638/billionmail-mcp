#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BillionMailClient } from "./client.js";

const baseUrl = process.env.BILLIONMAIL_BASE_URL;
const username = process.env.BILLIONMAIL_USER;
const password = process.env.BILLIONMAIL_PASSWORD;

if (!baseUrl || !username || !password) {
  console.error("Required environment variables: BILLIONMAIL_BASE_URL, BILLIONMAIL_USER, BILLIONMAIL_PASSWORD");
  process.exit(1);
}

const client = new BillionMailClient(baseUrl, username, password);

const server = new McpServer({
  name: "billionmail-mcp-server",
  version: "1.0.0",
});

// Tool registrations will be added here

const transport = new StdioServerTransport();
await server.connect(transport);
