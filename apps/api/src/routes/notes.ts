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

// POST /notes/transcribe — accepts audio file, returns transcription via Gemini
app.post("/transcribe", async (c) => {
  const tenant = c.get("tenant");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return c.json({ error: "Gemini API nie jest skonfigurowane" }, 503);

  const formData = await c.req.formData();
  const file = formData.get("audio") as File | null;
  if (!file) return c.json({ error: "Brak pliku audio" }, 400);

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) return c.json({ error: "Plik zbyt duży (max 10MB)" }, 400);

  const allowedTypes = ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav"];
  if (!allowedTypes.includes(file.type)) return c.json({ error: "Nieobsługiwany format audio" }, 400);

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: file.type, data: base64 } },
            { text: "Transkrybuj dokładnie to nagranie audio. Zwróć tylko sam tekst transkrypcji, bez dodatkowych komentarzy." },
          ],
        }],
      }),
    }
  );

  if (!res.ok) return c.json({ error: "Błąd Gemini API" }, 502);
  const json: any = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  return c.json({ text });
});

export default app;
