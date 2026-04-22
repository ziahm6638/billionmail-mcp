import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerRelayTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_relay_configs", "List SMTP relay configurations", {
    keyword: z.string().optional().describe("Search keyword"),
    rtype: z.string().optional().describe("Filter by type: gmail, sendgrid, custom, aws, mailgun, local"),
  }, async (params) => {
    const res = await client.get("/relay/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_relay_config", "Create a new SMTP relay configuration", {
    sender_domains: z.array(z.string()).describe("Sender domains to route through this relay"),
    relay_host: z.string().describe("SMTP relay server address"),
    relay_port: z.string().describe("SMTP relay port (e.g. 587)"),
    auth_user: z.string().optional().describe("SMTP username"),
    auth_password: z.string().optional().describe("SMTP password"),
    rtype: z.string().optional().describe("Type: gmail, sendgrid, custom, aws, mailgun, local"),
    remark: z.string().optional().describe("Description"),
  }, async (params) => {
    const res = await client.post("/relay/add", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_relay_config", "Update a relay configuration", {
    id: z.number().describe("Relay config ID"),
    relay_host: z.string().optional(),
    relay_port: z.string().optional(),
    auth_user: z.string().optional(),
    auth_password: z.string().optional(),
    rtype: z.string().optional(),
    remark: z.string().optional(),
  }, async (params) => {
    const res = await client.post("/relay/edit", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_relay_config", "Delete a relay configuration", {
    id: z.number().describe("Relay config ID"),
  }, async (params) => {
    const res = await client.post("/relay/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("test_relay_connection", "Test if an SMTP relay connection works", {
    relay_host: z.string().describe("SMTP server address"),
    relay_port: z.string().describe("SMTP port"),
    auth_user: z.string().optional().describe("Username"),
    auth_password: z.string().optional().describe("Password"),
  }, async (params) => {
    const res = await client.post("/relay/test_connection", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_unbound_domains", "Get domains not bound to any relay", {}, async () => {
    const res = await client.get("/relay/get_unbound_domains");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
