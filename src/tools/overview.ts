import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerOverviewTools(server: McpServer, client: BillionMailClient) {
  server.tool("get_overview", "Get mail sending overview: delivered, opened, clicked, bounced rates", {
    start_time: z.number().describe("Start time (unix timestamp)"),
    end_time: z.number().describe("End time (unix timestamp)"),
    domain: z.string().optional().describe("Filter by domain"),
    campaign_id: z.number().optional().describe("Filter by campaign ID"),
  }, async (params) => {
    const res = await client.get("/overview", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_failed_list", "Get list of failed email deliveries", {
    start_time: z.number().describe("Start time (unix timestamp)"),
    end_time: z.number().describe("End time (unix timestamp)"),
    domain: z.string().optional().describe("Filter by domain"),
    campaign_id: z.number().optional().describe("Filter by campaign ID"),
  }, async (params) => {
    const res = await client.get("/overview/failed", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
