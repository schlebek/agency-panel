import { Worker } from "bullmq";
import { db, clients, tenants, senutoSnapshots, senutoKeywords, senutoCompetitors } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { getSenutoClient, ensureValidSenutoToken } from "../lib/senuto";
import { redis } from "../lib/redis";

function getLatestValue(obj: Record<string, number> | undefined): number | null {
  if (!obj || typeof obj !== "object") return null;
  const dates = Object.keys(obj).sort();
  const latest = dates[dates.length - 1];
  return latest != null ? (obj[latest] ?? null) : null;
}

function normalizeKeyword(raw: any): {
  keyword: string;
  position: number | null;
  previousPosition: number | null;
  positionChange: number | null;
  searchVolume: number | null;
  cpc: string | null;
  estimatedTraffic: number | null;
  url: string | null;
} | null {
  // Senuto may use different field names depending on API version
  const keyword = raw.keyword_phrase ?? raw.keyword ?? raw.phrase;
  if (!keyword) return null;

  const position = raw.position ?? null;
  const previousPosition = raw.previous_position ?? raw.prev_position ?? null;
  // positionChange: positive = improvement (moved up), negative = drop
  const positionChange = raw.change ?? raw.position_change ??
    (position != null && previousPosition != null ? previousPosition - position : null);

  const searchVolume = raw.search_volume ?? raw.volume ?? null;
  const cpc = raw.cpc != null ? String(raw.cpc) : null;
  const estimatedTraffic = raw.traffic ?? raw.estimated_traffic ?? null;
  const url = raw.url ?? raw.landing_page ?? null;

  return { keyword, position, previousPosition, positionChange, searchVolume, cpc, estimatedTraffic, url };
}

function normalizeCompetitor(raw: any): {
  domain: string;
  commonKeywords: number | null;
  keywordsTop3: number | null;
  keywordsTop10: number | null;
  keywordsTop50: number | null;
  visibilityIndex: string | null;
} | null {
  const domain = raw.domain ?? raw.competitor_domain;
  if (!domain) return null;
  return {
    domain,
    commonKeywords: raw.common_keywords ?? raw.common ?? null,
    keywordsTop3: raw.keywords_top3 ?? raw.top3 ?? null,
    keywordsTop10: raw.keywords_top10 ?? raw.top10 ?? null,
    keywordsTop50: raw.keywords_top50 ?? raw.top50 ?? null,
    visibilityIndex: raw.visibility_index != null ? String(raw.visibility_index) : null,
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

    // --- 1. Visibility summary ---
    const result = await senuto.getPositionsHistory(domain);
    const domainData = result?.data?.[0]?.data?.all ?? {};

    const top3 = getLatestValue(domainData.keywords_top3);
    const top10 = getLatestValue(domainData.keywords_top10);
    const top50 = getLatestValue(domainData.keywords_top50);
    const top100 = getLatestValue(domainData.keywords_top100);

    await db.insert(senutoSnapshots).values({
      clientId,
      snapshotDate,
      top3,
      top10,
      top50,
      top100,
      totalKeywords: top100,
      visibilityIndex: null,
      rawData: { domain, meta: domainData },
    });

    console.log(`[senuto-sync] Client ${clientId} (${domain}): top3=${top3} top10=${top10} top50=${top50} top100=${top100}`);

    // --- 2. Keyword rankings ---
    try {
      const allKeywords: any[] = [];
      const perPage = 100;
      const maxPages = 5; // up to 500 keywords

      for (let page = 1; page <= maxPages; page++) {
        const kwResult = await senuto.getKeywords(domain, { limit: perPage, page });
        const rows: any[] = kwResult?.data ?? [];
        if (!rows.length) break;
        allKeywords.push(...rows);
        if (rows.length < perPage) break;
      }

      if (allKeywords.length > 0) {
        // Delete previous keywords for this client (keep only latest)
        await db.delete(senutoKeywords).where(eq(senutoKeywords.clientId, clientId));

        const toInsert = allKeywords
          .map(normalizeKeyword)
          .filter((k): k is NonNullable<ReturnType<typeof normalizeKeyword>> => k !== null)
          .map((k) => ({ ...k, clientId, snapshotDate }));

        if (toInsert.length > 0) {
          // Batch insert in chunks of 100
          for (let i = 0; i < toInsert.length; i += 100) {
            await db.insert(senutoKeywords).values(toInsert.slice(i, i + 100));
          }
        }

        console.log(`[senuto-sync] Saved ${toInsert.length} keywords for ${domain}`);
      } else {
        console.log(`[senuto-sync] No keywords returned for ${domain}`);
      }
    } catch (err: any) {
      console.error(`[senuto-sync] Keywords fetch failed for ${domain}:`, err.message);
      // Don't throw — visibility snapshot was already saved
    }

    // --- 3. Competitors ---
    try {
      const compResult = await senuto.getCompetitors(domain);
      const compRows: any[] = compResult?.data ?? [];

      if (compRows.length > 0) {
        await db.delete(senutoCompetitors).where(eq(senutoCompetitors.clientId, clientId));

        const toInsert = compRows
          .slice(0, 20)
          .map(normalizeCompetitor)
          .filter((c): c is NonNullable<ReturnType<typeof normalizeCompetitor>> => c !== null)
          .map((c) => ({ ...c, clientId, snapshotDate }));

        if (toInsert.length > 0) {
          await db.insert(senutoCompetitors).values(toInsert);
        }

        console.log(`[senuto-sync] Saved ${toInsert.length} competitors for ${domain}`);
      }
    } catch (err: any) {
      console.error(`[senuto-sync] Competitors fetch failed for ${domain}:`, err.message);
    }
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

senutoSyncWorker.on("failed", (job, err: any) => {
  console.error(`[senuto-sync] Job ${job?.id} failed:`, err.message);
});
