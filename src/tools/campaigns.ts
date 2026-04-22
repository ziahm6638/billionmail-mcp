import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BillionMailClient } from "../client.js";

export function registerCampaignTools(server: McpServer, client: BillionMailClient) {
  server.tool("list_campaign_tasks", "List email campaign tasks", {
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
    keyword: z.string().optional().describe("Search keyword"),
    status: z.number().optional().default(-1).describe("Task status filter (-1=all)"),
  }, async (params) => {
    const res = await client.get("/batch_mail/task/list", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_campaign_task", "Get campaign task details by ID", {
    id: z.number().describe("Task ID"),
  }, async (params) => {
    const res = await client.get("/batch_mail/task/find", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("create_campaign_task", "Create a new email campaign task", {
    addresser: z.string().describe("Sender email address"),
    subject: z.string().describe("Email subject"),
    template_id: z.number().describe("Email template ID"),
    group_id: z.number().describe("Contact group ID to send to"),
    full_name: z.string().optional().describe("Sender display name"),
    is_record: z.number().optional().default(1).describe("1=record tracking, 0=no tracking"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/create", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("update_campaign_task", "Update a campaign task", {
    task_id: z.number().describe("Task ID"),
    addresser: z.string().optional().describe("Sender email"),
    subject: z.string().optional().describe("Subject"),
    full_name: z.string().optional().describe("Sender name"),
    template_id: z.number().optional().describe("Template ID"),
    remark: z.string().optional().describe("Remark/notes"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/update", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("delete_campaign_task", "Delete a campaign task", {
    id: z.number().describe("Task ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/delete", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("pause_campaign_task", "Pause a running campaign task", {
    task_id: z.number().describe("Task ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/pause", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("resume_campaign_task", "Resume a paused campaign task", {
    task_id: z.number().describe("Task ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/resume", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("set_campaign_speed", "Set sending speed (concurrency) for a campaign", {
    task_id: z.number().describe("Task ID"),
    threads: z.number().describe("Thread count 1-100"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/speed", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("send_test_email", "Send a test email before launching a campaign", {
    addresser: z.string().describe("Sender email"),
    subject: z.string().describe("Subject"),
    recipient: z.string().describe("Test recipient email"),
    template_id: z.number().describe("Template ID"),
  }, async (params) => {
    const res = await client.post("/batch_mail/task/send_test", params);
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

  server.tool("get_campaign_overview", "Get campaign task overview statistics", {
    start_time: z.number().optional().describe("Start time (unix)"),
    end_time: z.number().optional().describe("End time (unix)"),
  }, async (params) => {
    const res = await client.get("/batch_mail/task/overview", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_campaign_logs", "Get email sending logs for a campaign", {
    task_id: z.number().describe("Task ID"),
    status: z.number().optional().describe("1=success, 0=failure"),
    domain: z.string().optional().describe("Domain filter"),
    page: z.number().optional().default(1),
    page_size: z.number().optional().default(20),
  }, async (params) => {
    const res = await client.get("/batch_mail/tracking/logs", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });

  server.tool("get_campaign_provider_stats", "Get email provider statistics for a campaign", {
    task_id: z.number().describe("Task ID"),
    status: z.number().optional().describe("1=success, 0=failure"),
  }, async (params) => {
    const res = await client.get("/batch_mail/tracking/mail_provider", params);
    return { content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }] };
  });
}
