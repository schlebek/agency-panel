import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, linkFiles, clients } from "@agency/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";
import { uploadFile, buildFileKey, getPresignedUrl, deleteFile } from "../lib/storage";

const app = new Hono();

app.use("*", requireAuth);

app.get("/", async (c) => {
  const tenant = c.get("tenant");
  const { clientId, year, month } = c.req.query();

  const conditions = [eq(linkFiles.tenantId, tenant.id)];
  if (clientId) conditions.push(eq(linkFiles.clientId, clientId));
  if (year) conditions.push(eq(linkFiles.year, parseInt(year)));
  if (month) conditions.push(eq(linkFiles.month, parseInt(month)));

  const files = await db
    .select()
    .from(linkFiles)
    .where(and(...conditions))
    .orderBy(desc(linkFiles.createdAt));

  return c.json(files);
});

// Upload pliku z linkami
app.post("/upload", requireOwnerOrAdmin, async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  const body = await c.req.parseBody();

  const file = body["file"] as File;
  const clientId = body["clientId"] as string;
  const year = parseInt(body["year"] as string);
  const month = parseInt(body["month"] as string);
  const description = body["description"] as string | undefined;
  const linksCount = body["linksCount"] ? parseInt(body["linksCount"] as string) : undefined;

  if (!file || !clientId || !year || !month) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const key = buildFileKey(tenant.id, clientId, "links", file.name);

  await uploadFile(key, buffer, file.type);

  const [linkFile] = await db.insert(linkFiles).values({
    tenantId: tenant.id,
    clientId,
    uploadedById: user.id,
    year,
    month,
    filename: file.name,
    fileUrl: key,
    fileSize: buffer.length,
    description,
    linksCount,
  }).returning();

  return c.json(linkFile, 201);
});

// Pobierz URL do pobrania pliku
app.get("/:id/download", async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();

  const [file] = await db
    .select()
    .from(linkFiles)
    .where(and(eq(linkFiles.id, id), eq(linkFiles.tenantId, tenant.id)))
    .limit(1);

  if (!file) return c.json({ error: "Not found" }, 404);

  const url = await getPresignedUrl(file.fileUrl, 300);
  return c.json({ url });
});

app.delete("/:id", requireOwnerOrAdmin, async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();

  const [file] = await db
    .select()
    .from(linkFiles)
    .where(and(eq(linkFiles.id, id), eq(linkFiles.tenantId, tenant.id)))
    .limit(1);

  if (!file) return c.json({ error: "Not found" }, 404);

  await deleteFile(file.fileUrl);
  await db.delete(linkFiles).where(eq(linkFiles.id, id));

  return c.json({ success: true });
});

export default app;
