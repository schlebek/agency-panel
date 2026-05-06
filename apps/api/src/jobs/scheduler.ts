import { db, clients } from "@agency/db";
import { eq } from "drizzle-orm";
import { scheduleSenutoSync, scheduleGscSync } from "../lib/queue";

async function scheduleAllDailySyncs() {
  try {
    const activeClients = await db
      .select({
        id: clients.id,
        tenantId: clients.tenantId,
        senutoProjectId: clients.senutoProjectId,
        gscPropertyUrl: clients.gscPropertyUrl,
        gscCredentials: clients.gscCredentials,
      })
      .from(clients)
      .where(eq(clients.isActive, true));

    let senutoCount = 0;
    let gscCount = 0;

    for (const client of activeClients) {
      if (client.senutoProjectId) {
        await scheduleSenutoSync(client.id, client.tenantId);
        senutoCount++;
      }
      if (client.gscPropertyUrl && client.gscCredentials) {
        await scheduleGscSync(client.id, client.tenantId);
        gscCount++;
      }
    }

    console.log(`[scheduler] Daily sync: ${senutoCount} Senuto, ${gscCount} GSC clients queued`);
  } catch (err) {
    console.error("[scheduler] Error scheduling daily syncs:", err);
  }
}

// Run at startup after a short delay (to let DB connections settle)
setTimeout(scheduleAllDailySyncs, 10_000);

// Re-run every 24h
setInterval(scheduleAllDailySyncs, 24 * 60 * 60 * 1_000);
