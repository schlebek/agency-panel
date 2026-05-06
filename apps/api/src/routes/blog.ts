import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, clients, blogBriefs } from "@agency/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const app = new Hono();
app.use("*", requireAuth);

const briefSchema = z.object({
  title: z.string().min(1).max(500),
  briefUrl: z.string().url().nullable().optional(),
  status: z.enum(["pending", "sent", "published"]).optional(),
  publishUrl: z.string().url().nullable().optional(),
});

async function assertClientAccess(clientId: string, tenantId: string) {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)))
    .limit(1);
  return !!client;
}

app.get("/:clientId/blog", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  if (!(await assertClientAccess(clientId, tenant.id))) {
    return c.json({ error: "Not found" }, 404);
  }

  const list = await db
    .select()
    .from(blogBriefs)
    .where(and(eq(blogBriefs.clientId, clientId), eq(blogBriefs.tenantId, tenant.id)))
    .orderBy(desc(blogBriefs.createdAt));

  return c.json(list);
});

app.post("/:clientId/blog", zValidator("json", briefSchema), async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  if (!(await assertClientAccess(clientId, tenant.id))) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = c.req.valid("json");
  const [brief] = await db
    .insert(blogBriefs)
    .values({ ...body, clientId, tenantId: tenant.id })
    .returning();

  return c.json(brief, 201);
});

app.patch("/:clientId/blog/:briefId", zValidator("json", briefSchema.partial()), async (c) => {
  const tenant = c.get("tenant");
  const { clientId, briefId } = c.req.param();
  const body = c.req.valid("json");

  const [brief] = await db
    .update(blogBriefs)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(blogBriefs.id, briefId), eq(blogBriefs.clientId, clientId), eq(blogBriefs.tenantId, tenant.id)))
    .returning();

  if (!brief) return c.json({ error: "Not found" }, 404);
  return c.json(brief);
});

app.delete("/:clientId/blog/:briefId", async (c) => {
  const tenant = c.get("tenant");
  const { clientId, briefId } = c.req.param();

  const result = await db
    .delete(blogBriefs)
    .where(and(eq(blogBriefs.id, briefId), eq(blogBriefs.clientId, clientId), eq(blogBriefs.tenantId, tenant.id)))
    .returning({ id: blogBriefs.id });

  if (!result.length) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default app;
