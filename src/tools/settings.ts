import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerSettingsTools(server: McpServer, client: BillionMailClient) {
  server.tool("get_version", "Get BillionMail version information", {}, async () => {
    const res = await client.get("/settings/get_version");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_system_config", "Get system configuration", {}, async () => {
    const res = await client.get("/settings/get_system_config");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("set_system_config_key", "Set a single system configuration key", {
    key: z.string().describe("Configuration key"),
    value: z.string().describe("Configuration value"),
  }, async (params) => {
    const res = await client.post("/settings/set_system_config_key", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_timezones", "Get available timezone list", {}, async () => {
    const res = await client.get("/settings/get_timezone_list");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("check_domain_blacklist", "Check if a domain/IP is on any spam blacklists", {
    domain: z.string().describe("Domain to check"),
  }, async (params) => {
    const res = await client.post("/domain_blocklist/check", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
