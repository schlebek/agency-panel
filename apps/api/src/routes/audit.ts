import { Hono } from "hono";
import { db, auditLogs } from "@agency/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const app = new Hono();
app.use("*", requireAuth);

app.get("/:clientId/audit", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);

  const logs = await db.select()
    .from(auditLogs)
    .where(and(eq(auditLogs.tenantId, tenant.id), eq(auditLogs.clientId, clientId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return c.json(logs);
});

export default app;

// Helper do logowania z innych routes
export async function logAction(
  tenantId: string,
  userId: string | undefined,
  clientId: string | undefined,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await db.insert(auditLogs).values({ tenantId, userId, clientId, action, entityType, entityId, metadata });
  } catch {
    // Nie blokuj głównego przepływu jeśli log się nie uda
  }
}
