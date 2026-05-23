import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, clients } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const app = new Hono();
app.use("*", requireAuth);

const goalsSchema = z.object({
  top3Target: z.number().int().min(0).optional(),
  top10Target: z.number().int().min(0).optional(),
  top50Target: z.number().int().min(0).optional(),
  clicksTarget: z.number().int().min(0).optional(),
  keywordsTarget: z.number().int().min(0).optional(),
});

app.get("/:clientId/goals", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  const [client] = await db.select({ goals: clients.goals })
    .from(clients).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id))).limit(1);
  if (!client) return c.json({ error: "Not found" }, 404);

  return c.json(client.goals ?? {});
});

app.put("/:clientId/goals", zValidator("json", goalsSchema), async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  const body = c.req.valid("json");

  const [client] = await db.select({ id: clients.id, goals: clients.goals })
    .from(clients).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id))).limit(1);
  if (!client) return c.json({ error: "Not found" }, 404);

  const updated = { ...(client.goals ?? {}), ...body };
  await db.update(clients).set({ goals: updated, updatedAt: new Date() }).where(eq(clients.id, clientId));

  return c.json(updated);
});

export default app;
