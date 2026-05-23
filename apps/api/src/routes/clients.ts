import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, clients } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";
import { scheduleSenutoSync, scheduleGscSync } from "../lib/queue";

const app = new Hono();

app.use("*", requireAuth);

const clientSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(1).max(500),
  contactEmail: z.string().email().nullable().optional(),
  clientType: z.enum(["shop", "company"]).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  engine: z.string().max(100).nullable().optional(),
  senutoProjectId: z.string().nullable().optional(),
  senutoApiKey: z.string().nullable().optional(),
  gscPropertyUrl: z.string().nullable().optional(),
  adsNotes: z.string().nullable().optional(),
});

function sanitizeClient(c: any) {
  const { gscCredentials, ...rest } = c;
  return { ...rest, hasGscCredentials: !!gscCredentials };
}

app.get("/", async (c) => {
  const tenant = c.get("tenant");
  const list = await db
    .select()
    .from(clients)
    .where(and(eq(clients.tenantId, tenant.id), eq(clients.isActive, true)));
  return c.json(list.map(sanitizeClient));
});

app.post("/", requireOwnerOrAdmin, zValidator("json", clientSchema), async (c) => {
  const tenant = c.get("tenant");
  const body = c.req.valid("json");

  const [client] = await db.insert(clients).values({
    ...body,
    tenantId: tenant.id,
  }).returning();

  if (client.senutoProjectId) {
    await scheduleSenutoSync(client.id, tenant.id);
  }
  if (client.gscPropertyUrl) {
    await scheduleGscSync(client.id, tenant.id);
  }

  return c.json(client, 201);
});

app.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Not found" }, 404);
  return c.json(sanitizeClient(client));
});

app.patch("/:id", requireOwnerOrAdmin, zValidator("json", clientSchema.partial()), async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();
  const body = c.req.valid("json");

  const [client] = await db
    .update(clients)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.tenantId, tenant.id)))
    .returning();

  if (!client) return c.json({ error: "Not found" }, 404);
  return c.json(sanitizeClient(client));
});

app.delete("/:id", requireOwnerOrAdmin, async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();

  await db
    .update(clients)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.tenantId, tenant.id)));

  return c.json({ success: true });
});

export default app;
