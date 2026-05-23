import { Hono } from "hono";
import { db, clients, uptimeChecks } from "@agency/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { scheduleUptimeCheck } from "../lib/queue";

const app = new Hono();
app.use("*", requireAuth);

// Historia uptime ostatnie 7 dni
app.get("/:clientId/uptime", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  const [client] = await db.select({ id: clients.id, uptimeEnabled: clients.uptimeEnabled, uptimeStatus: clients.uptimeStatus, domain: clients.domain })
    .from(clients).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id))).limit(1);
  if (!client) return c.json({ error: "Not found" }, 404);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const checks = await db.select()
    .from(uptimeChecks)
    .where(and(eq(uptimeChecks.clientId, clientId), gte(uptimeChecks.checkedAt, since)))
    .orderBy(desc(uptimeChecks.checkedAt))
    .limit(500);

  const total = checks.length;
  const upCount = checks.filter(c => c.status === "up").length;
  const uptimePct = total > 0 ? Math.round((upCount / total) * 100) : null;
  const avgResponseMs = total > 0
    ? Math.round(checks.reduce((s, c) => s + (c.responseTimeMs ?? 0), 0) / total)
    : null;

  return c.json({ enabled: client.uptimeEnabled, status: client.uptimeStatus, domain: client.domain, uptimePct, avgResponseMs, checks });
});

// Włącz/wyłącz monitoring
app.patch("/:clientId/uptime/toggle", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  const [client] = await db.select({ id: clients.id, uptimeEnabled: clients.uptimeEnabled })
    .from(clients).where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id))).limit(1);
  if (!client) return c.json({ error: "Not found" }, 404);

  const newState = !client.uptimeEnabled;
  await db.update(clients).set({ uptimeEnabled: newState, updatedAt: new Date() }).where(eq(clients.id, clientId));

  if (newState) await scheduleUptimeCheck(clientId);

  return c.json({ uptimeEnabled: newState });
});

export default app;
