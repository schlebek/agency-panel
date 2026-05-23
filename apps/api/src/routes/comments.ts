import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, clientComments, clients } from "@agency/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const app = new Hono();
app.use("*", requireAuth);

app.get("/:clientId/comments", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  const [client] = await db.select({ id: clients.id }).from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id))).limit(1);
  if (!client) return c.json({ error: "Not found" }, 404);

  const comments = await db.select().from(clientComments)
    .where(and(eq(clientComments.clientId, clientId), eq(clientComments.tenantId, tenant.id)))
    .orderBy(desc(clientComments.createdAt))
    .limit(100);

  return c.json(comments);
});

app.post("/:clientId/comments", zValidator("json", z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(),
})), async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  const { clientId } = c.req.param();
  const { content, parentId } = c.req.valid("json");

  const [comment] = await db.insert(clientComments).values({
    tenantId: tenant.id,
    clientId,
    authorType: "agency",
    authorId: user.id,
    authorName: user.name,
    content,
    parentId,
  }).returning();

  return c.json(comment, 201);
});

app.delete("/:clientId/comments/:commentId", async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  const { commentId } = c.req.param();

  const [comment] = await db.select().from(clientComments)
    .where(and(eq(clientComments.id, commentId), eq(clientComments.tenantId, tenant.id))).limit(1);
  if (!comment) return c.json({ error: "Not found" }, 404);
  if (comment.authorId !== user.id && user.role === "member") return c.json({ error: "Forbidden" }, 403);

  await db.delete(clientComments).where(eq(clientComments.id, commentId));
  return c.json({ success: true });
});

export default app;
