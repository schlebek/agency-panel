import { Worker } from "bullmq";
import { db, webhooks } from "@agency/db";
import { eq } from "drizzle-orm";
import { redis } from "../lib/redis";
import crypto from "crypto";

export const webhookWorker = new Worker(
  "webhook-delivery",
  async (job) => {
    const { webhookId, event, payload } = job.data;

    const [wh] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
    if (!wh?.isActive) return;

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const signature = crypto.createHmac("sha256", wh.secret).update(body).digest("hex");

    const res = await fetch(wh.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agency-Panel-Signature": `sha256=${signature}`,
        "X-Agency-Panel-Event": event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await db.update(webhooks).set({ lastTriggeredAt: new Date() }).where(eq(webhooks.id, webhookId));
  },
  { connection: redis, concurrency: 5 }
);

webhookWorker.on("failed", (job, err: any) => {
  console.error(`[webhook] Job ${job?.id} failed:`, err.message);
});
