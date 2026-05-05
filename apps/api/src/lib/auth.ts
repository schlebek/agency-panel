import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, users, sessions, tenants } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { addDays } from "date-fns";

const JWT_SECRET = process.env.BETTER_AUTH_SECRET!;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string; tenantId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string; tenantId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; tenantId: string };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, tenantId: string) {
  const token = signToken({ userId, tenantId });
  const expiresAt = addDays(new Date(), 7);

  await db.insert(sessions).values({ userId, token, expiresAt });
  return token;
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      tenantId: users.tenantId,
      isActive: users.isActive,
    })
    .from(users)
    .innerJoin(sessions, and(eq(sessions.userId, users.id), eq(sessions.token, token)))
    .where(eq(users.id, payload.userId))
    .limit(1);

  return user ?? null;
}

export async function getUserTenant(tenantId: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return tenant ?? null;
}
