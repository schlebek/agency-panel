import { Worker } from "bullmq";
import { db, clients, uptimeChecks } from "@agency/db";
import { eq } from "drizzle-orm";
import { redis } from "../lib/redis";

export const uptimeWorker = new Worker(
  "uptime-monitor",
  async (job) => {
    const { clientId } = job.data;
    const [client] = await db.select({ id: clients.id, domain: clients.domain })
      .from(clients).where(eq(clients.id, clientId)).limit(1);
    if (!client?.domain) return;

    const url = client.domain.startsWith("http") ? client.domain : `https://${client.domain}`;
    const start = Date.now();
    let status: "up" | "down" | "timeout" = "down";
    let statusCode: number | undefined;
    let errorMessage: string | undefined;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
      clearTimeout(timeout);
      statusCode = res.status;
      status = res.status < 500 ? "up" : "down";
    } catch (err: any) {
      status = err.name === "AbortError" ? "timeout" : "down";
      errorMessage = err.message?.slice(0, 200);
    }

    const responseTimeMs = Date.now() - start;

    await db.insert(uptimeChecks).values({ clientId, status, statusCode, responseTimeMs, errorMessage });
    await db.update(clients).set({ uptimeStatus: status, updatedAt: new Date() }).where(eq(clients.id, clientId));

    // Usuń wpisy starsze niż 30 dni
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.delete(uptimeChecks)
      .where(eq(uptimeChecks.clientId, clientId));
  },
  { connection: redis, concurrency: 10 }
);

uptimeWorker.on("failed", (job, err: any) => {
  console.error(`[uptime] Job ${job?.id} failed:`, err.message);
});
