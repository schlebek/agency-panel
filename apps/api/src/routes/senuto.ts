import { Hono } from "hono";
import { db, clients, senutoSnapshots, senutoKeywords } from "@agency/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getSenutoClient } from "../lib/senuto";
import { scheduleSenutoSync } from "../lib/queue";

const app = new Hono();

app.use("*", requireAuth);

// Pobierz historię widoczności (dane z cache)
app.get("/:clientId/visibility", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  const { limit = "30" } = c.req.query();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);

  const snapshots = await db
    .select()
    .from(senutoSnapshots)
    .where(eq(senutoSnapshots.clientId, clientId))
    .orderBy(desc(senutoSnapshots.snapshotDate))
    .limit(parseInt(limit));

  return c.json({ snapshots: snapshots.reverse() });
});

// Pobierz ranking słów kluczowych
app.get("/:clientId/keywords", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  const { limit = "100", sort = "position" } = c.req.query();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);

  const latestSnapshot = await db
    .select()
    .from(senutoSnapshots)
    .where(eq(senutoSnapshots.clientId, clientId))
    .orderBy(desc(senutoSnapshots.snapshotDate))
    .limit(1);

  if (!latestSnapshot.length) {
    return c.json({ keywords: [], lastSync: null });
  }

  const keywords = await db
    .select()
    .from(senutoKeywords)
    .where(and(
      eq(senutoKeywords.clientId, clientId),
      eq(senutoKeywords.snapshotDate, latestSnapshot[0].snapshotDate)
    ))
    .orderBy(sort === "change" ? desc(senutoKeywords.positionChange) : asc(senutoKeywords.position))
    .limit(parseInt(limit));

  return c.json({ keywords, lastSync: latestSnapshot[0].createdAt });
});

// Największe wzrosty
app.get("/:clientId/gainers", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);

  const latestSnapshot = await db
    .select({ snapshotDate: senutoSnapshots.snapshotDate })
    .from(senutoSnapshots)
    .where(eq(senutoSnapshots.clientId, clientId))
    .orderBy(desc(senutoSnapshots.snapshotDate))
    .limit(1);

  if (!latestSnapshot.length) return c.json({ gainers: [] });

  const gainers = await db
    .select()
    .from(senutoKeywords)
    .where(and(
      eq(senutoKeywords.clientId, clientId),
      eq(senutoKeywords.snapshotDate, latestSnapshot[0].snapshotDate)
    ))
    .orderBy(desc(senutoKeywords.positionChange))
    .limit(20);

  return c.json({ gainers: gainers.filter(k => (k.positionChange ?? 0) > 0) });
});

// Największe spadki
app.get("/:clientId/losers", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);

  const latestSnapshot = await db
    .select({ snapshotDate: senutoSnapshots.snapshotDate })
    .from(senutoSnapshots)
    .where(eq(senutoSnapshots.clientId, clientId))
    .orderBy(desc(senutoSnapshots.snapshotDate))
    .limit(1);

  if (!latestSnapshot.length) return c.json({ losers: [] });

  const losers = await db
    .select()
    .from(senutoKeywords)
    .where(and(
      eq(senutoKeywords.clientId, clientId),
      eq(senutoKeywords.snapshotDate, latestSnapshot[0].snapshotDate)
    ))
    .orderBy(asc(senutoKeywords.positionChange))
    .limit(20);

  return c.json({ losers: losers.filter(k => (k.positionChange ?? 0) < 0) });
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
  if (!client.senutoProjectId) return c.json({ error: "Senuto project not configured" }, 400);

  await scheduleSenutoSync(clientId, tenant.id);
  return c.json({ success: true, message: "Sync scheduled" });
});

export default app;
