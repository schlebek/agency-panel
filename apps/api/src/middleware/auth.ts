import type { Context, Next } from "hono";
import { getUserFromToken, getUserTenant } from "../lib/auth";

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? c.req.header("x-session-token");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await getUserFromToken(token);
  if (!user || !user.isActive) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const tenant = await getUserTenant(user.tenantId);
  if (!tenant || !tenant.isActive) {
    return c.json({ error: "Tenant inactive or not found" }, 403);
  }

  c.set("user", user);
  c.set("tenant", tenant);

  await next();
}

export async function requireOwnerOrAdmin(c: Context, next: Next) {
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") {
    return c.json({ error: "Insufficient permissions" }, 403);
  }
  await next();
}

export async function requireOwner(c: Context, next: Next) {
  const user = c.get("user");
  if (user.role !== "owner") {
    return c.json({ error: "Owner access required" }, 403);
  }
  await next();
}
