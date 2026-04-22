import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerMailServiceTools(server: McpServer, client: BillionMailClient) {
  // BCC
  server.tool("list_bcc_rules", "List mail BCC (blind carbon copy) rules", {
    type: z.string().optional().describe("Filter: 'sender' or 'recipient'"),
    domain: z.string().optional().describe("Domain filter"),
    page_num: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/mail_bcc/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("add_bcc_rule", "Add a BCC rule to copy emails", {
    type: z.string().describe("'sender' or 'recipient'"),
    address: z.string().describe("Email address or domain to match"),
    goto: z.string().describe("BCC target email address"),
    active: z.number().optional().default(1).describe("1=enabled, 0=disabled"),
  }, async (params) => {
    const res = await client.post("/mail_bcc/add", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("edit_bcc_rule", "Edit a BCC rule", {
    id: z.number().describe("BCC rule ID"),
    type: z.string().optional().describe("'sender' or 'recipient'"),
    address: z.string().optional().describe("Email/domain to match"),
    goto: z.string().describe("BCC target email"),
    active: z.number().optional().default(1),
  }, async (params) => {
    const res = await client.post("/mail_bcc/edit", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_bcc_rule", "Delete a BCC rule", {
    id: z.number().describe("BCC rule ID"),
  }, async (params) => {
    const res = await client.post("/mail_bcc/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  // Forwarding
  server.tool("list_mail_forwards", "List mail forwarding rules", {
    domain: z.string().optional().describe("Domain filter"),
    search_key: z.string().optional().describe("Search address"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/mail_forward/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("add_mail_forward", "Add a mail forwarding rule", {
    address: z.string().describe("Source email address (e.g. user@example.com)"),
    goto: z.string().describe("Forward target address(es), newline-separated"),
    active: z.number().optional().default(1).describe("1=enabled, 0=disabled"),
  }, async (params) => {
    const res = await client.post("/mail_forward/add", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("edit_mail_forward", "Edit a mail forwarding rule", {
    address: z.string().describe("Source email address"),
    goto: z.string().optional().describe("New target address(es)"),
    active: z.number().optional().describe("1=enabled, 0=disabled"),
  }, async (params) => {
    const res = await client.post("/mail_forward/edit", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_mail_forward", "Delete a mail forwarding rule", {
    address: z.string().describe("Source email address to remove forwarding for"),
  }, async (params) => {
    const res = await client.post("/mail_forward/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  // Postfix Queue
  server.tool("list_postfix_queue", "List postfix mail queue", {
    domain: z.string().optional().describe("Domain filter"),
  }, async (params) => {
    const res = await client.get("/postfix_queue/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("flush_postfix_queue", "Force send all queued mail", {
    domain: z.string().optional().describe("Optional domain to flush"),
  }, async (params) => {
    const res = await client.post("/postfix_queue/flush", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_deferred_queue", "Clear all deferred (stuck) mail from queue", {}, async () => {
    const res = await client.post("/postfix_queue/delete");
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
}
