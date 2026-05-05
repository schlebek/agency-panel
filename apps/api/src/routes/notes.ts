import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, optimizationNotes, clients } from "@agency/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";

const app = new Hono();

app.use("*", requireAuth);

const noteSchema = z.object({
  clientId: z.string().uuid(),
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
  type: z.enum(["optimization", "text", "brief", "link_building", "technical", "other"]),
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  url: z.string().url().optional(),
});

app.get("/", async (c) => {
  const tenant = c.get("tenant");
  const { clientId, year, month, type } = c.req.query();

  const conditions = [eq(optimizationNotes.tenantId, tenant.id)];
  if (clientId) conditions.push(eq(optimizationNotes.clientId, clientId));
  if (year) conditions.push(eq(optimizationNotes.year, parseInt(year)));
  if (month) conditions.push(eq(optimizationNotes.month, parseInt(month)));
  if (type) conditions.push(eq(optimizationNotes.type, type as any));

  const notes = await db
    .select()
    .from(optimizationNotes)
    .where(and(...conditions))
    .orderBy(desc(optimizationNotes.createdAt));

  return c.json(notes);
});

app.post("/", requireOwnerOrAdmin, zValidator("json", noteSchema), async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  const body = c.req.valid("json");

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, body.clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);

  const [note] = await db.insert(optimizationNotes).values({
    ...body,
    tenantId: tenant.id,
    authorId: user.id,
  }).returning();

  return c.json(note, 201);
});

app.patch("/:id", requireOwnerOrAdmin, zValidator("json", noteSchema.partial()), async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();
  const body = c.req.valid("json");

  const [note] = await db
    .update(optimizationNotes)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(optimizationNotes.id, id), eq(optimizationNotes.tenantId, tenant.id)))
    .returning();

  if (!note) return c.json({ error: "Not found" }, 404);
  return c.json(note);
});

app.delete("/:id", requireOwnerOrAdmin, async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();

  const result = await db
    .delete(optimizationNotes)
    .where(and(eq(optimizationNotes.id, id), eq(optimizationNotes.tenantId, tenant.id)))
    .returning({ id: optimizationNotes.id });

  if (!result.length) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default app;
