import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, clients, clientAccounts } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireOwnerOrAdmin } from "../middleware/auth";
import { hashPassword } from "../lib/auth";

const app = new Hono();
app.use("*", requireAuth);

async function assertClientAccess(clientId: string, tenantId: string) {
  const [c] = await db.select({ id: clients.id }).from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId))).limit(1);
  return !!c;
}

// Lista kont klientów dla danego klienta
app.get("/:clientId/accounts", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  if (!(await assertClientAccess(clientId, tenant.id))) return c.json({ error: "Not found" }, 404);

  const accounts = await db.select({
    id: clientAccounts.id,
    email: clientAccounts.email,
    name: clientAccounts.name,
    isActive: clientAccounts.isActive,
    lastLoginAt: clientAccounts.lastLoginAt,
    createdAt: clientAccounts.createdAt,
  }).from(clientAccounts).where(and(eq(clientAccounts.clientId, clientId), eq(clientAccounts.tenantId, tenant.id)));

  return c.json(accounts);
});

// Utwórz konto klienta
app.post("/:clientId/accounts", requireOwnerOrAdmin, zValidator("json", z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})), async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  if (!(await assertClientAccess(clientId, tenant.id))) return c.json({ error: "Not found" }, 404);

  const { name, email, password } = c.req.valid("json");

  const [existing] = await db.select({ id: clientAccounts.id }).from(clientAccounts)
    .where(eq(clientAccounts.email, email)).limit(1);
  if (existing) return c.json({ error: "Email jest już używany" }, 409);

  const passwordHash = await hashPassword(password);
  const [account] = await db.insert(clientAccounts).values({
    tenantId: tenant.id, clientId, email, name, passwordHash,
  }).returning({ id: clientAccounts.id, email: clientAccounts.email, name: clientAccounts.name, isActive: clientAccounts.isActive, createdAt: clientAccounts.createdAt });

  return c.json(account, 201);
});

// Resetuj hasło / dezaktywuj konto
app.patch("/:clientId/accounts/:accountId", requireOwnerOrAdmin, zValidator("json", z.object({
  name: z.string().min(2).max(100).optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  const tenant = c.get("tenant");
  const { clientId, accountId } = c.req.param();
  const body = c.req.valid("json");

  const updates: any = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.password) updates.passwordHash = await hashPassword(body.password);

  const [account] = await db.update(clientAccounts).set(updates)
    .where(and(eq(clientAccounts.id, accountId), eq(clientAccounts.clientId, clientId), eq(clientAccounts.tenantId, tenant.id)))
    .returning({ id: clientAccounts.id, email: clientAccounts.email, name: clientAccounts.name, isActive: clientAccounts.isActive });

  if (!account) return c.json({ error: "Not found" }, 404);
  return c.json(account);
});

// Usuń konto
app.delete("/:clientId/accounts/:accountId", requireOwnerOrAdmin, async (c) => {
  const tenant = c.get("tenant");
  const { clientId, accountId } = c.req.param();

  const result = await db.delete(clientAccounts)
    .where(and(eq(clientAccounts.id, accountId), eq(clientAccounts.clientId, clientId), eq(clientAccounts.tenantId, tenant.id)))
    .returning({ id: clientAccounts.id });

  if (!result.length) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// Tab visibility
app.patch("/:clientId/tab-visibility", zValidator("json", z.object({
  visibility: z.record(z.string(), z.boolean()),
})), async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  const { visibility } = c.req.valid("json");

  const [updated] = await db.update(clients)
    .set({ tabVisibility: visibility, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .returning({ id: clients.id, tabVisibility: clients.tabVisibility });

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

export default app;
