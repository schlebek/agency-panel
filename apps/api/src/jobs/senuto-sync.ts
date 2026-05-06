import { Worker } from "bullmq";
import { db, clients, tenants, senutoSnapshots, senutoKeywords } from "@agency/db";
import { eq } from "drizzle-orm";
import { getSenutoClient } from "../lib/senuto";
import { redis } from "../lib/redis";

export const senutoSyncWorker = new Worker(
  "senuto-sync",
  async (job) => {
    const { clientId, tenantId } = job.data;

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client?.senutoProjectId) {
      throw new Error(`Client ${clientId} has no Senuto project configured`);
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    const apiKey = client.senutoApiKey ?? tenant?.senutoApiKey ?? process.env.SENUTO_API_KEY!;
    const senuto = getSenutoClient(apiKey);

    const [visibility, keywords] = await Promise.all([
      senuto.getVisibility(client.senutoProjectId),
      senuto.getKeywordPositions(client.senutoProjectId, { limit: 500 }),
    ]);

    const snapshotDate = new Date();

    await db.insert(senutoSnapshots).values({
      clientId,
      snapshotDate,
      top3: visibility?.top3 ?? null,
      top10: visibility?.top10 ?? null,
      top50: visibility?.top50 ?? null,
      top100: visibility?.top100 ?? null,
      totalKeywords: visibility?.total ?? null,
      visibilityIndex: visibility?.visibility_index?.toString() ?? null,
      rawData: visibility,
    });

    if (keywords?.data?.length) {
      const rows = keywords.data.map((kw: any) => ({
        clientId,
        snapshotDate,
        keyword: kw.keyword,
        position: kw.position,
        previousPosition: kw.previous_position,
        positionChange: kw.position_change,
        searchVolume: kw.search_volume,
        url: kw.url,
      }));

      // Wstaw partiami po 500
      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(senutoKeywords).values(rows.slice(i, i + 500));
      }
    }

    console.log(`[senuto-sync] Client ${clientId}: synced ${keywords?.data?.length ?? 0} keywords`);
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

senutoSyncWorker.on("failed", (job, err: any) => {
  console.error(`[senuto-sync] Job ${job?.id} failed:`, err.message, err.response?.data ?? "");
});
