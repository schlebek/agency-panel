import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, webhooks, WEBHOOK_EVENTS } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import crypto from "node:crypto";

const app = new Hono();
app.use("*", requireAuth);

const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(WEBHOOK_EVENTS as [string, ...string[]])).min(1),
  isActive: z.boolean().optional().default(true),
});

app.get("/", async (c) => {
  const tenant = c.get("tenant");
  const list = await db.select().from(webhooks).where(eq(webhooks.tenantId, tenant.id));
  return c.json(list);
});

app.post("/", zValidator("json", webhookSchema), async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const { url, events, isActive } = c.req.valid("json");
  const secret = crypto.randomBytes(32).toString("hex");

  const [webhook] = await db.insert(webhooks).values({
    tenantId: tenant.id,
    url,
    secret,
    events: events as typeof WEBHOOK_EVENTS[number][],
    isActive,
  }).returning();

  return c.json(webhook, 201);
});

app.patch("/:id", zValidator("json", webhookSchema.partial()), async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.param();
  const body = c.req.valid("json");

  const [existing] = await db.select({ id: webhooks.id })
    .from(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.tenantId, tenant.id))).limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const [updated] = await db.update(webhooks).set(body).where(eq(webhooks.id, id)).returning();
  return c.json(updated);
});

app.delete("/:id", async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.param();
  const [existing] = await db.select({ id: webhooks.id })
    .from(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.tenantId, tenant.id))).limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.delete(webhooks).where(eq(webhooks.id, id));
  return c.json({ success: true });
});

// Test delivery — sends a ping event to verify the endpoint
app.post("/:id/test", async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.param();
  const [webhook] = await db.select()
    .from(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.tenantId, tenant.id))).limit(1);
  if (!webhook) return c.json({ error: "Not found" }, 404);

  const payload = JSON.stringify({ event: "ping", timestamp: new Date().toISOString(), tenantId: tenant.id });
  const sig = "sha256=" + crypto.createHmac("sha256", webhook.secret).update(payload).digest("hex");

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agency-Panel-Signature": sig },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });
    return c.json({ success: res.ok, statusCode: res.status });
  } catch (err: any) {
    return c.json({ success: false, error: err.message });
  }
});

export default app;
