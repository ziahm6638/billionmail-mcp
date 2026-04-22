import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerTagTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_tags", "List tags with pagination", {
    group_id: z.number().optional().describe("Filter by group ID"),
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/tags/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_all_tags", "Get all tags", {}, async () => {
    const res = await client.get("/tags/all");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_tag", "Create a new tag", {
    group_id: z.number().describe("Group ID to create tag in"),
    name: z.string().describe("Tag name (max 50 chars)"),
  }, async (params) => {
    const res = await client.post("/tags/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_tag", "Update a tag name", {
    id: z.number().describe("Tag ID"),
    name: z.string().describe("New tag name"),
  }, async (params) => {
    const res = await client.post("/tags/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_tag", "Delete a tag", {
    id: z.number().describe("Tag ID"),
  }, async (params) => {
    const res = await client.post("/tags/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
}
