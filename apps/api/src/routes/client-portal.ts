import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, clientAccounts, clientSessions, clients } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";
import jwt from "jsonwebtoken";
import { addDays } from "date-fns";

const app = new Hono();
const JWT_SECRET = process.env.BETTER_AUTH_SECRET!;

function signClientToken(payload: { clientAccountId: string; clientId: string; tenantId: string }) {
  return jwt.sign({ ...payload, type: "client" }, JWT_SECRET, { expiresIn: "30d" });
}

function verifyClientToken(token: string) {
  try {
    const p = jwt.verify(token, JWT_SECRET) as any;
    if (p.type !== "client") return null;
    return p as { clientAccountId: string; clientId: string; tenantId: string };
  } catch {
    return null;
  }
}

async function requireClientAuth(c: any, next: any) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? c.req.header("x-client-token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = verifyClientToken(token);
  if (!payload) return c.json({ error: "Unauthorized" }, 401);

  const [session] = await db
    .select()
    .from(clientSessions)
    .where(and(eq(clientSessions.token, token), eq(clientSessions.clientAccountId, payload.clientAccountId)))
    .limit(1);
  if (!session || session.expiresAt < new Date()) return c.json({ error: "Session expired" }, 401);

  const [account] = await db
    .select()
    .from(clientAccounts)
    .where(and(eq(clientAccounts.id, payload.clientAccountId), eq(clientAccounts.isActive, true)))
    .limit(1);
  if (!account) return c.json({ error: "Account disabled" }, 403);

  c.set("clientAccount", account);
  await next();
}

app.post("/login", zValidator("json", z.object({
  email: z.string().email(),
  password: z.string(),
})), async (c) => {
  const { email, password } = c.req.valid("json");

  const [account] = await db
    .select()
    .from(clientAccounts)
    .where(eq(clientAccounts.email, email))
    .limit(1);

  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    return c.json({ error: "Nieprawidłowe dane logowania" }, 401);
  }
  if (!account.isActive) return c.json({ error: "Konto jest nieaktywne" }, 403);

  const token = signClientToken({ clientAccountId: account.id, clientId: account.clientId, tenantId: account.tenantId });
  const expiresAt = addDays(new Date(), 30);

  await db.insert(clientSessions).values({ clientAccountId: account.id, token, expiresAt });
  await db.update(clientAccounts).set({ lastLoginAt: new Date() }).where(eq(clientAccounts.id, account.id));

  const [client] = await db.select().from(clients).where(eq(clients.id, account.clientId)).limit(1);

  return c.json({
    token,
    account: { id: account.id, email: account.email, name: account.name, clientId: account.clientId, tenantId: account.tenantId },
    client: client ? { id: client.id, name: client.name, domain: client.domain, logoUrl: client.logoUrl, tabVisibility: client.tabVisibility } : null,
  });
});

app.get("/me", requireClientAuth, async (c) => {
  const account = c.get("clientAccount");
  const [client] = await db.select().from(clients).where(eq(clients.id, account.clientId)).limit(1);
  return c.json({
    account: { id: account.id, email: account.email, name: account.name, clientId: account.clientId, tenantId: account.tenantId },
    client: client ? { id: client.id, name: client.name, domain: client.domain, logoUrl: client.logoUrl, tabVisibility: client.tabVisibility } : null,
  });
});

app.post("/logout", requireClientAuth, async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "") ?? c.req.header("x-client-token");
  if (token) await db.delete(clientSessions).where(eq(clientSessions.token, token));
  return c.json({ success: true });
});

// Dane portalu klienta — prace, optymalizacja, blogi itd.
app.get("/data", requireClientAuth, async (c) => {
  const account = c.get("clientAccount");
  const { clientId, tenantId } = account;

  const { optimizationNotes, blogBriefs, linkFiles } = await import("@agency/db");
  const { desc } = await import("drizzle-orm");

  const [notes, briefs, links] = await Promise.all([
    db.select().from(optimizationNotes)
      .where(and(eq(optimizationNotes.clientId, clientId), eq(optimizationNotes.tenantId, tenantId)))
      .orderBy(desc(optimizationNotes.createdAt))
      .limit(20),
    db.select().from(blogBriefs)
      .where(and(eq(blogBriefs.clientId, clientId), eq(blogBriefs.tenantId, tenantId)))
      .orderBy(desc(blogBriefs.createdAt)),
    db.select().from(linkFiles)
      .where(and(eq(linkFiles.clientId, clientId), eq(linkFiles.tenantId, tenantId)))
      .orderBy(desc(linkFiles.createdAt))
      .limit(10),
  ]);

  return c.json({ notes, briefs, links });
});

export { requireClientAuth };
export default app;
