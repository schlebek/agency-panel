import { Hono } from "hono";
import { db, clients, gscSnapshots, gscTopPages, gscTopQueries } from "@agency/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getAuthUrl, exchangeCode } from "../lib/gsc";
import { scheduleGscSync } from "../lib/queue";

const app = new Hono();

app.use("*", requireAuth);

// Inicjuj OAuth do GSC
app.get("/:clientId/auth-url", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);

  const state = Buffer.from(JSON.stringify({ clientId, tenantId: tenant.id })).toString("base64");
  const url = getAuthUrl(state);
  return c.json({ url });
});

// Callback OAuth
app.post("/:clientId/auth-callback", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  const { code } = await c.req.json();

  const tokens = await exchangeCode(code);

  await db
    .update(clients)
    .set({ gscCredentials: tokens, updatedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)));

  await scheduleGscSync(clientId, tenant.id);
  return c.json({ success: true });
});

// Dane podsumowujące GSC
app.get("/:clientId/summary", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  const { limit = "12" } = c.req.query();

  const snapshots = await db
    .select()
    .from(gscSnapshots)
    .where(eq(gscSnapshots.clientId, clientId))
    .orderBy(desc(gscSnapshots.createdAt))
    .limit(parseInt(limit));

  return c.json({ snapshots: snapshots.reverse() });
});

// Top strony
app.get("/:clientId/pages", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  const latestSnapshot = await db
    .select({ snapshotDate: gscSnapshots.createdAt })
    .from(gscSnapshots)
    .where(eq(gscSnapshots.clientId, clientId))
    .orderBy(desc(gscSnapshots.createdAt))
    .limit(1);

  if (!latestSnapshot.length) return c.json({ pages: [] });

  const pages = await db
    .select()
    .from(gscTopPages)
    .where(eq(gscTopPages.clientId, clientId))
    .orderBy(desc(gscTopPages.clicks))
    .limit(50);

  return c.json({ pages });
});

// Top zapytania
app.get("/:clientId/queries", async (c) => {
  const { clientId } = c.req.param();

  const queries = await db
    .select()
    .from(gscTopQueries)
    .where(eq(gscTopQueries.clientId, clientId))
    .orderBy(desc(gscTopQueries.clicks))
    .limit(50);

  return c.json({ queries });
});

// Ręczna synchronizacja
app.post("/:clientId/sync", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);
  if (!client.gscCredentials) return c.json({ error: "GSC not connected" }, 400);

  await scheduleGscSync(clientId, tenant.id);
  return c.json({ success: true, message: "GSC sync scheduled" });
});

export default app;
