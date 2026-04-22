import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerSendApiTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_send_apis", "List Send API configurations", {
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/batch_mail/api/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_send_api", "Create a new Send API configuration", {
    api_name: z.string().describe("API name"),
    template_id: z.number().describe("Email template ID to use"),
    subject: z.string().optional().describe("Email subject"),
    addresser: z.string().optional().describe("Sender email address"),
    full_name: z.string().optional().describe("Sender display name"),
    group_id: z.number().optional().describe("Associated contact group ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/api/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_send_api", "Update a Send API configuration", {
    id: z.number().describe("API ID"),
    api_name: z.string().optional().describe("API name"),
    template_id: z.number().optional().describe("Template ID"),
    subject: z.string().optional().describe("Subject"),
    addresser: z.string().optional().describe("Sender email"),
    full_name: z.string().optional().describe("Sender name"),
  }, async (params) => {
    const res = await client.post("/batch_mail/api/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_send_api", "Delete a Send API configuration", {
    id: z.number().describe("API ID to delete"),
  }, async (params) => {
    const res = await client.post("/batch_mail/api/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("send_email_via_api", "Send a single email via the Send API", {
    api_key: z.string().describe("API key (from Send API config)"),
    addresser: z.string().optional().describe("Sender email (overrides API config)"),
    recipient: z.string().describe("Recipient email address"),
    attribs: z.record(z.string()).optional().describe("Custom template attributes"),
  }, async (params) => {
    const body: Record<string, any> = { recipient: params.recipient };
    if (params.addresser) body.addresser = params.addresser;
    if (params.attribs) body.attribs = params.attribs;
    // Send API uses x-api-key header, need special handling
    const res = await client.post("/batch_mail/api/send", { ...body, "x-api-key": params.api_key });
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("batch_send_email_via_api", "Send emails to multiple recipients via the Send API", {
    api_key: z.string().describe("API key"),
    recipients: z.array(z.string()).describe("Recipient email addresses"),
    addresser: z.string().optional().describe("Sender email"),
    attribs: z.record(z.string()).optional().describe("Custom template attributes"),
  }, async (params) => {
    const body: Record<string, any> = { recipients: params.recipients };
    if (params.addresser) body.addresser = params.addresser;
    if (params.attribs) body.attribs = params.attribs;
    const res = await client.post("/batch_mail/api/batch_send", { ...body, "x-api-key": params.api_key });
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_send_api_stats", "Get Send API overview statistics", {
    start_time: z.number().optional().describe("Start time (unix timestamp)"),
    end_time: z.number().optional().describe("End time (unix timestamp)"),
  }, async (params) => {
    const res = await client.get("/batch_mail/api/overview_stats", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
