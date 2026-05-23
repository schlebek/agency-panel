import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, users, tenants, sessions, invitations } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword, createSession, getUserFromToken } from "../lib/auth";
import { getPresignedUrl } from "../lib/storage";
import { requireAuth } from "../middleware/auth";
import { addDays } from "date-fns";
import crypto from "crypto";

const app = new Hono();

const registerSchema = z.object({
  agencyName: z.string().min(2).max(100),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

app.get("/setup-status", async (c) => {
  const [existing] = await db.select({ id: tenants.id }).from(tenants).limit(1);
  return c.json({ needed: !existing });
});

app.post("/setup", zValidator("json", registerSchema), async (c) => {
  const [existing] = await db.select({ id: tenants.id }).from(tenants).limit(1);
  if (existing) {
    return c.json({ error: "Setup already completed" }, 409);
  }

  const { agencyName, name, email, password } = c.req.valid("json");
  const slug = agencyName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  const passwordHash = await hashPassword(password);

  const [tenant] = await db.insert(tenants).values({
    name: agencyName,
    slug: `${slug}-${crypto.randomBytes(3).toString("hex")}`,
    plan: "enterprise",
    trialEndsAt: null,
  }).returning();

  const [user] = await db.insert(users).values({
    tenantId: tenant.id,
    email,
    name,
    passwordHash,
    role: "owner",
  }).returning({ id: users.id, email: users.email, name: users.name, role: users.role, tenantId: users.tenantId });

  const token = await createSession(user.id, tenant.id);

  return c.json({ user, tenant, token }, 201);
});

app.post("/register", zValidator("json", registerSchema), async (c) => {
  const { agencyName, name, email, password } = c.req.valid("json");

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return c.json({ error: "Email already in use" }, 409);
  }

  const slug = agencyName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  const passwordHash = await hashPassword(password);

  const [tenant] = await db.insert(tenants).values({
    name: agencyName,
    slug: `${slug}-${crypto.randomBytes(3).toString("hex")}`,
    plan: "trial",
    trialEndsAt: addDays(new Date(), 14),
  }).returning();

  const [user] = await db.insert(users).values({
    tenantId: tenant.id,
    email,
    name,
    passwordHash,
    role: "owner",
  }).returning({ id: users.id, email: users.email, name: users.name, role: users.role, tenantId: users.tenantId });

  const token = await createSession(user.id, tenant.id);

  return c.json({ user, tenant, token }, 201);
});

app.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (!user.isActive) {
    return c.json({ error: "Account disabled" }, 403);
  }

  const token = await createSession(user.id, user.tenantId);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
    token,
  });
});

app.post("/logout", requireAuth, async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  return c.json({ success: true });
});

app.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const tenant = c.get("tenant");
  const logoUrl = tenant.logoKey ? await getPresignedUrl(tenant.logoKey, 86400) : null;
  return c.json({ user, tenant: { ...tenant, logoUrl } });
});

app.patch("/me", requireAuth, zValidator("json", z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
})), async (c) => {
  const authUser = c.get("user");
  const body = c.req.valid("json");

  const [dbUser] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  if (!dbUser) return c.json({ error: "Not found" }, 404);

  const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };

  if (body.name) updates.name = body.name;

  if (body.email && body.email !== dbUser.email) {
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
    if (exists) return c.json({ error: "Email już jest używany" }, 409);
    updates.email = body.email;
  }

  if (body.newPassword) {
    if (!body.currentPassword) return c.json({ error: "Podaj aktualne hasło" }, 400);
    const valid = await verifyPassword(body.currentPassword, dbUser.passwordHash);
    if (!valid) return c.json({ error: "Aktualne hasło jest nieprawidłowe" }, 400);
    updates.passwordHash = await hashPassword(body.newPassword);
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, authUser.id))
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, tenantId: users.tenantId });

  return c.json({ user: updated });
});

// GET /auth/invite/:token — returns invite info (email, agency name) without consuming the invite
app.get("/invite/:token", async (c) => {
  const { token } = c.req.param();
  const [inv] = await db.select({
    id: invitations.id,
    email: invitations.email,
    role: invitations.role,
    expiresAt: invitations.expiresAt,
    tenantId: invitations.tenantId,
  }).from(invitations).where(and(eq(invitations.token, token), eq(invitations.acceptedAt, null as any))).limit(1);

  if (!inv) return c.json({ error: "Zaproszenie jest nieważne lub wygasło" }, 404);
  if (inv.expiresAt < new Date()) return c.json({ error: "Zaproszenie wygasło" }, 410);

  const [tenant] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, inv.tenantId)).limit(1);
  return c.json({ email: inv.email, role: inv.role, agencyName: tenant?.name });
});

// POST /auth/accept-invite — creates user account from invitation
app.post("/accept-invite", zValidator("json", z.object({
  token: z.string(),
  name: z.string().min(2).max(100),
  password: z.string().min(8),
})), async (c) => {
  const { token, name, password } = c.req.valid("json");

  const [inv] = await db.select().from(invitations)
    .where(and(eq(invitations.token, token), eq(invitations.acceptedAt, null as any))).limit(1);

  if (!inv) return c.json({ error: "Zaproszenie jest nieważne lub wygasło" }, 404);
  if (inv.expiresAt < new Date()) return c.json({ error: "Zaproszenie wygasło" }, 410);

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, inv.email)).limit(1);
  if (existing) return c.json({ error: "Konto z tym emailem już istnieje" }, 409);

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({
    tenantId: inv.tenantId,
    email: inv.email,
    name,
    passwordHash,
    role: inv.role,
    emailVerified: true,
  }).returning({ id: users.id, email: users.email, name: users.name, role: users.role, tenantId: users.tenantId });

  await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, inv.id));

  const sessionToken = await createSession(user.id, inv.tenantId);
  return c.json({ user, token: sessionToken }, 201);
});

export default app;
