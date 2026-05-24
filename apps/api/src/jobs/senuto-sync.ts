import { Worker } from "bullmq";
import { db, clients, tenants, senutoSnapshots, senutoCompetitors } from "@agency/db";
import { eq } from "drizzle-orm";
import { getSenutoClient, ensureValidSenutoToken } from "../lib/senuto";
import { redis } from "../lib/redis";

function getLatestValue(obj: Record<string, number> | undefined): number | null {
  if (!obj || typeof obj !== "object") return null;
  const dates = Object.keys(obj).sort();
  const latest = dates[dates.length - 1];
  return latest != null ? (obj[latest] ?? null) : null;
}

function normalizeCompetitor(raw: any, clientId: string, snapshotDate: Date) {
  const domain = raw.domain;
  if (!domain || raw.is_main_domain) return null;

  const s = raw.statistics ?? {};
  return {
    clientId,
    snapshotDate,
    domain,
    commonKeywords: raw.common_keywords ?? null,
    keywordsTop3: s.top3?.recent_value ?? null,
    keywordsTop10: s.top10?.recent_value ?? null,
    keywordsTop50: s.top50?.recent_value ?? null,
    visibilityIndex: s.visibility?.recent_value != null ? String(s.visibility.recent_value) : null,
  };
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

    const rawKey = client.senutoApiKey ?? tenant?.senutoApiKey ?? process.env.SENUTO_API_KEY!;
    if (!rawKey) {
      throw new Error(`Client ${clientId}: missing Senuto API key`);
    }

    const apiKey = await ensureValidSenutoToken(tenantId, rawKey);
    const senuto = getSenutoClient(apiKey);

    const domain = (client.senutoProjectId && client.senutoProjectId.includes("."))
      ? client.senutoProjectId
      : client.domain;

    const snapshotDate = new Date();

    // --- 1. Visibility history (GET) ---
    const result = await senuto.getPositionsHistory(domain);
    const domainData = result?.data?.[0]?.data?.all ?? {};

    const top3 = getLatestValue(domainData.keywords_top3);
    const top10 = getLatestValue(domainData.keywords_top10);
    const top50 = getLatestValue(domainData.keywords_top50);
    const top100 = getLatestValue(domainData.keywords_top100);

    // --- 2. Competitors + Google Ads equivalent (POST) ---
    let adsEquivalent: string | null = null;
    let visibilityScore: string | null = null;

    try {
      const compResult = await senuto.getCompetitors(domain);
      const compRows: any[] = compResult?.data ?? [];

      // First row is always the main domain itself
      const mainDomain = compRows.find((r) => r.is_main_domain);
      if (mainDomain?.statistics) {
        const ae = mainDomain.statistics.ads_equivalent?.recent_value;
        const vis = mainDomain.statistics.visibility?.recent_value;
        if (ae != null) adsEquivalent = String(ae);
        if (vis != null) visibilityScore = String(vis);
      }

      // Save competitors (skip main domain)
      const toInsert = compRows
        .map((r) => normalizeCompetitor(r, clientId, snapshotDate))
        .filter((c): c is NonNullable<ReturnType<typeof normalizeCompetitor>> => c !== null);

      if (toInsert.length > 0) {
        await db.delete(senutoCompetitors).where(eq(senutoCompetitors.clientId, clientId));
        await db.insert(senutoCompetitors).values(toInsert);
        console.log(`[senuto-sync] Saved ${toInsert.length} competitors for ${domain}, ads_equivalent=${adsEquivalent}`);
      }
    } catch (err: any) {
      console.error(`[senuto-sync] Competitors fetch failed for ${domain}:`, err.message);
    }

    // --- 3. Save snapshot ---
    await db.insert(senutoSnapshots).values({
      clientId,
      snapshotDate,
      top3,
      top10,
      top50,
      top100,
      totalKeywords: top100,
      visibilityIndex: null,
      visibilityScore,
      adsEquivalent,
      rawData: { domain, meta: domainData },
    });

    console.log(`[senuto-sync] Client ${clientId} (${domain}): top3=${top3} top10=${top10} top50=${top50} ads_eq=${adsEquivalent}`);
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

senutoSyncWorker.on("failed", (job, err: any) => {
  console.error(`[senuto-sync] Job ${job?.id} failed:`, err.message);
});
