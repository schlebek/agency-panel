import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, tenants } from "@agency/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { SenutoClient } from "../lib/senuto";

const app = new Hono();

app.use("*", requireAuth);

app.get("/", async (c) => {
  const tenant = c.get("tenant");
  const [t] = await db.select().from(tenants).where(eq(tenants.id, tenant.id)).limit(1);
  if (!t) return c.json({ error: "Tenant not found" }, 404);
  return c.json({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    isActive: t.isActive,
    trialEndsAt: t.trialEndsAt,
    senutoApiKey: t.senutoApiKey ? "••••••••" + t.senutoApiKey.slice(-4) : null,
    hasSenutoKey: !!t.senutoApiKey,
  });
});

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  senutoLogin: z.string().email().optional(),
  senutoPassword: z.string().min(1).optional(),
});

app.put("/", zValidator("json", updateSchema), async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = c.req.valid("json");
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.senutoLogin && body.senutoPassword) {
    try {
      const token = await SenutoClient.authenticate(body.senutoLogin, body.senutoPassword);
      updates.senutoApiKey = token;
    } catch {
      return c.json({ error: "Nieprawidłowy login lub hasło Senuto" }, 400);
    }
  }
  await db.update(tenants).set(updates).where(eq(tenants.id, tenant.id));
  return c.json({ success: true });
});

export default app;
