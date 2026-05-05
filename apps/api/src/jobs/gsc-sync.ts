import { Worker } from "bullmq";
import { db, clients, gscSnapshots, gscTopPages, gscTopQueries } from "@agency/db";
import { eq } from "drizzle-orm";
import { getGscData, getGscDailyData } from "../lib/gsc";
import { redis } from "../lib/redis";

export const gscSyncWorker = new Worker(
  "gsc-sync",
  async (job) => {
    const { clientId } = job.data;

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client?.gscCredentials || !client?.gscPropertyUrl) {
      throw new Error(`Client ${clientId} has no GSC credentials configured`);
    }

    const credentials = client.gscCredentials as any;
    const { summary, pages, queries, dateFrom, dateTo } = await getGscData(
      credentials,
      client.gscPropertyUrl,
      28
    );

    if (summary) {
      await db.insert(gscSnapshots).values({
        clientId,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        clicks: summary.clicks,
        impressions: summary.impressions,
        ctr: summary.ctr?.toString(),
        avgPosition: summary.position?.toString(),
        rawData: { summary, dateFrom, dateTo },
      });
    }

    const snapshotDate = new Date();

    if (pages.length) {
      await db.insert(gscTopPages).values(pages.map((p: any) => ({
        clientId,
        snapshotDate,
        page: p.keys[0],
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: p.ctr?.toString(),
        avgPosition: p.position?.toString(),
      })));
    }

    if (queries.length) {
      await db.insert(gscTopQueries).values(queries.map((q: any) => ({
        clientId,
        snapshotDate,
        query: q.keys[0],
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr?.toString(),
        avgPosition: q.position?.toString(),
      })));
    }

    console.log(`[gsc-sync] Client ${clientId}: synced GSC data`);
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

gscSyncWorker.on("failed", (job, err) => {
  console.error(`[gsc-sync] Job ${job?.id} failed:`, err.message);
});
