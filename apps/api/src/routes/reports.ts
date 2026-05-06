import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, reports, clients } from "@agency/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";
import { scheduleReportGeneration } from "../lib/queue";
import { getPresignedUrl } from "../lib/storage";

const app = new Hono();

app.use("*", requireAuth);

const createReportSchema = z.object({
  clientId: z.string().uuid(),
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
  title: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

app.get("/", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.query();

  const conditions = [eq(reports.tenantId, tenant.id)];
  if (clientId) conditions.push(eq(reports.clientId, clientId));

  const list = await db
    .select()
    .from(reports)
    .where(and(...conditions))
    .orderBy(desc(reports.year), desc(reports.month));

  return c.json(list);
});

app.post("/", requireOwnerOrAdmin, zValidator("json", createReportSchema), async (c) => {
  const tenant = c.get("tenant");
  const body = c.req.valid("json");

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, body.clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);

  const title = body.title ?? `Raport SEO – ${client.name} – ${body.month}/${body.year}`;

  const [report] = await db.insert(reports).values({
    tenantId: tenant.id,
    clientId: body.clientId,
    year: body.year,
    month: body.month,
    title,
    recipientEmail: body.recipientEmail ?? client.contactEmail ?? undefined,
    notes: body.notes,
    status: "generating",
  }).returning();

  await scheduleReportGeneration(report.id);

  return c.json(report, 201);
});

app.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();

  const [report] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.tenantId, tenant.id)))
    .limit(1);

  if (!report) return c.json({ error: "Not found" }, 404);
  return c.json(report);
});

// Pobierz presigned URL do pobrania PDF
app.get("/:id/download", async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();

  const [report] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.tenantId, tenant.id)))
    .limit(1);

  if (!report) return c.json({ error: "Not found" }, 404);
  if (report.status !== "ready" || !report.pdfUrl) return c.json({ error: "PDF nie jest gotowy" }, 400);

  const url = await getPresignedUrl(report.pdfUrl, 300);
  return c.json({ url });
});

// Wyślij raport emailem
app.post("/:id/send", requireOwnerOrAdmin, async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();
  const { email } = await c.req.json();

  const [report] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.tenantId, tenant.id)))
    .limit(1);

  if (!report) return c.json({ error: "Not found" }, 404);
  if (report.status !== "ready") return c.json({ error: "Report not ready yet" }, 400);
  if (!report.pdfUrl) return c.json({ error: "PDF not generated" }, 400);

  const recipientEmail = email ?? report.recipientEmail;
  if (!recipientEmail) return c.json({ error: "No recipient email" }, 400);

  // Job wysyłki emaila
  const { emailQueue } = await import("../lib/queue");
  await emailQueue.add("send-report", {
    reportId: id,
    recipientEmail,
    pdfUrl: report.pdfUrl,
    reportTitle: report.title,
  });

  await db
    .update(reports)
    .set({ status: "sent", sentAt: new Date(), recipientEmail })
    .where(eq(reports.id, id));

  return c.json({ success: true });
});

export default app;
