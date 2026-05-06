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
    if (!client?.domain) {
      throw new Error(`Client ${clientId} has no domain configured`);
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    const apiKey = client.senutoApiKey ?? tenant?.senutoApiKey ?? process.env.SENUTO_API_KEY!;
    if (!apiKey) {
      throw new Error(`Client ${clientId}: missing Senuto API key (set in tenant settings or SENUTO_API_KEY env)`);
    }

    const senuto = getSenutoClient(apiKey);

    // Use senutoDomain override if set, otherwise fall back to client domain
    const domain = (client.senutoProjectId && client.senutoProjectId.includes("."))
      ? client.senutoProjectId
      : client.domain;

    const keywords = await senuto.getVisibilityKeywords(domain, { limit: 500 });
    const kwList: any[] = keywords?.data ?? [];

    const snapshotDate = new Date();

    // Calculate visibility buckets from keyword positions
    const top3 = kwList.filter((kw) => kw.position != null && kw.position <= 3).length;
    const top10 = kwList.filter((kw) => kw.position != null && kw.position <= 10).length;
    const top50 = kwList.filter((kw) => kw.position != null && kw.position <= 50).length;
    const top100 = kwList.filter((kw) => kw.position != null && kw.position <= 100).length;
    const totalKeywords = keywords?.meta?.total ?? kwList.length;
    const visibilityIndex = keywords?.meta?.visibility_index?.toString() ?? null;

    await db.insert(senutoSnapshots).values({
      clientId,
      snapshotDate,
      top3,
      top10,
      top50,
      top100,
      totalKeywords,
      visibilityIndex,
      rawData: { domain, meta: keywords?.meta ?? null },
    });

    if (kwList.length > 0) {
      const rows = kwList.map((kw: any) => ({
        clientId,
        snapshotDate,
        keyword: kw.keyword ?? kw.phrase ?? "",
        position: kw.position ?? null,
        previousPosition: kw.position_prev ?? kw.previous_position ?? null,
        positionChange: kw.position_change ?? null,
        searchVolume: kw.search_volume ?? kw.volume ?? null,
        url: kw.url ?? null,
      }));

      for (let i = 0; i < rows.length; i += 500) {
        await db.insert(senutoKeywords).values(rows.slice(i, i + 500));
      }
    }

    console.log(`[senuto-sync] Client ${clientId} (${domain}): synced ${kwList.length} keywords`);
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

senutoSyncWorker.on("failed", (job, err: any) => {
  console.error(`[senuto-sync] Job ${job?.id} failed:`, err.message, err.response?.data ?? "");
});
