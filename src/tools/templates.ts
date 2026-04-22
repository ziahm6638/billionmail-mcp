import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerTemplateTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_templates", "List email templates with pagination", {
    keyword: z.string().optional().describe("Search by template name"),
    add_type: z.number().optional().default(-1).describe("Filter: 0=HTML, 1=Drag, 2=AI, -1=all"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/email_template/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_all_templates", "Get all email templates", {}, async () => {
    const res = await client.get("/email_template/all");
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_template", "Get a single email template by ID", {
    id: z.number().describe("Template ID"),
  }, async (params) => {
    const res = await client.get("/email_template/get", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_template", "Create a new email template", {
    temp_name: z.string().describe("Template name"),
    add_type: z.number().describe("0=HTML, 1=Drag, 2=AI"),
    html_content: z.string().optional().describe("HTML content (required for type 0 or 1)"),
  }, async (params) => {
    const res = await client.post("/email_template/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_template", "Update an email template", {
    id: z.number().describe("Template ID"),
    temp_name: z.string().optional().describe("New template name"),
    html_content: z.string().optional().describe("New HTML content"),
  }, async (params) => {
    const res = await client.post("/email_template/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_template", "Delete an email template", {
    id: z.number().describe("Template ID"),
  }, async (params) => {
    const res = await client.post("/email_template/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("copy_template", "Copy an email template", {
    id: z.number().describe("Template ID to copy"),
  }, async (params) => {
    const res = await client.post("/email_template/copy", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("check_email_content", "Check email content for spam score and issues", {
    content: z.string().describe("Email HTML content to check"),
  }, async (params) => {
    const res = await client.post("/email_template/check", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
