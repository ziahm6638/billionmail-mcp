import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerMailboxTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_mailboxes", "List mailboxes with pagination", {
    domain: z.string().optional().describe("Filter by domain"),
    keyword: z.string().optional().describe("Search keyword"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/mailbox/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_all_mailboxes", "Get all mailboxes without pagination", {
    domain: z.string().optional().describe("Filter by domain"),
  }, async (params) => {
    const res = await client.get("/mailbox/all", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_mailbox", "Create a new mailbox (email account)", {
    domain: z.string().describe("Domain name"),
    local_part: z.string().describe("Username part before @ (e.g. 'info' for info@example.com)"),
    password: z.string().describe("Password (min 8 chars)"),
    full_name: z.string().optional().describe("Display name"),
    active: z.number().optional().default(1).describe("1=enabled, 0=disabled"),
    quota: z.number().optional().default(5242880).describe("Mailbox quota in KB"),
  }, async (params) => {
    const res = await client.post("/mailbox/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("batch_create_mailboxes", "Create multiple mailboxes at once", {
    domain: z.string().describe("Domain name"),
    count: z.number().describe("Number of mailboxes to create (min 2)"),
    prefix: z.string().optional().default("user").describe("Email name prefix"),
    quota: z.number().optional().default(5242880).describe("Quota per mailbox in KB"),
  }, async (params) => {
    const res = await client.post("/mailbox/batch_create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_mailbox", "Update a mailbox", {
    domain: z.string().describe("Domain name"),
    local_part: z.string().describe("Username part before @"),
    password: z.string().describe("New password (min 8 chars)"),
    full_name: z.string().optional().describe("Display name"),
    active: z.number().optional().default(1).describe("1=enabled, 0=disabled"),
    quota: z.number().optional().default(5242880).describe("Quota in KB"),
  }, async (params) => {
    const res = await client.post("/mailbox/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_mailboxes", "Delete one or more mailboxes", {
    emails: z.array(z.string()).describe("List of email addresses to delete"),
  }, async (params) => {
    const res = await client.post("/mailbox/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_all_emails", "Get all email addresses for a domain", {
    domain: z.string().optional().describe("Filter by domain"),
  }, async (params) => {
    const res = await client.get("/mailbox/all_email", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
