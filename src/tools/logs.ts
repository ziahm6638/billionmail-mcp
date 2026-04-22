import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerLogTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_operation_logs", "List operation/audit logs", {
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
    keyword: z.string().optional().describe("Search keyword"),
    type: z.string().optional().describe("Log type filter"),
    start_time: z.number().optional().describe("Start time (unix)"),
    end_time: z.number().optional().describe("End time (unix)"),
  }, async (params) => {
    const res = await client.get("/operation_log/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("list_output_logs", "List system output logs", {
    start_date: z.string().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().describe("End date (YYYY-MM-DD)"),
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/operation_log/output/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_latest_output_log", "Get the most recent output log entry", {}, async () => {
    const res = await client.get("/operation_log/output/latest");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
