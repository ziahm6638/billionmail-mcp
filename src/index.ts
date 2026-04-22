#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BillionMailClient } from "./client.js";
import { registerDomainTools } from "./tools/domain.js";
import { registerMailboxTools } from "./tools/mailbox.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerTemplateTools } from "./tools/templates.js";
import { registerSendApiTools } from "./tools/send-api.js";
import { registerCampaignTools } from "./tools/campaigns.js";
import { registerRelayTools } from "./tools/relay.js";
import { registerOverviewTools } from "./tools/overview.js";
import { registerSettingsTools } from "./tools/settings.js";
import { registerTagTools } from "./tools/tags.js";
import { registerLogTools } from "./tools/logs.js";
import { registerMailServiceTools } from "./tools/mail-services.js";

const baseUrl = process.env.BILLIONMAIL_BASE_URL;
const username = process.env.BILLIONMAIL_USER;
const password = process.env.BILLIONMAIL_PASSWORD;

const safePath = process.env.BILLIONMAIL_SAFE_PATH;

if (!baseUrl || !username || !password) {
  console.error("Required environment variables: BILLIONMAIL_BASE_URL, BILLIONMAIL_USER, BILLIONMAIL_PASSWORD");
  console.error("Optional: BILLIONMAIL_SAFE_PATH (if your instance uses a safe path URL)");
  process.exit(1);
}

const client = new BillionMailClient(baseUrl, username, password, safePath);

const server = new McpServer({
  name: "billionmail-mcp-server",
  version: "1.0.0",
});

registerDomainTools(server, client);
registerMailboxTools(server, client);
registerContactTools(server, client);
registerTemplateTools(server, client);
registerSendApiTools(server, client);
registerCampaignTools(server, client);
registerRelayTools(server, client);
registerOverviewTools(server, client);
registerSettingsTools(server, client);
registerTagTools(server, client);
registerLogTools(server, client);
registerMailServiceTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
