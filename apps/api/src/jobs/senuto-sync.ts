import { Worker } from "bullmq";
import { db, clients, tenants, senutoSnapshots } from "@agency/db";
import { eq } from "drizzle-orm";
import { getSenutoClient } from "../lib/senuto";
import { redis } from "../lib/redis";

function getLatestValue(obj: Record<string, number> | undefined): number | null {
  if (!obj || typeof obj !== "object") return null;
  const dates = Object.keys(obj).sort();
  const latest = dates[dates.length - 1];
  return latest != null ? (obj[latest] ?? null) : null;
}

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
      throw new Error(`Client ${clientId}: missing Senuto API key`);
    }

    const senuto = getSenutoClient(apiKey);

    // Use senutoDomain override if it looks like a domain, else use client.domain
    const domain = (client.senutoProjectId && client.senutoProjectId.includes("."))
      ? client.senutoProjectId
      : client.domain;

    const result = await senuto.getPositionsHistory(domain);

    const domainData = result?.data?.[0]?.data?.all ?? {};

    const top3 = getLatestValue(domainData.keywords_top3);
    const top10 = getLatestValue(domainData.keywords_top10);
    const top50 = getLatestValue(domainData.keywords_top50);
    const top100 = getLatestValue(domainData.keywords_top100);

    await db.insert(senutoSnapshots).values({
      clientId,
      snapshotDate: new Date(),
      top3,
      top10,
      top50,
      top100,
      totalKeywords: top100,
      visibilityIndex: null,
      rawData: { domain, meta: domainData },
    });

    console.log(`[senuto-sync] Client ${clientId} (${domain}): top3=${top3} top10=${top10} top50=${top50} top100=${top100}`);
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

senutoSyncWorker.on("failed", (job, err: any) => {
  console.error(`[senuto-sync] Job ${job?.id} failed:`, err.message);
});
