import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, users, tenants, sessions } from "@agency/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, createSession, getUserFromToken } from "../lib/auth";
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
  return c.json({ user, tenant });
});

export default app;
