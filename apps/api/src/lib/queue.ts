import { Queue, Worker } from "bullmq";
import { redis } from "./redis";

const connection = { host: redis.options.host, port: redis.options.port as number, password: redis.options.password as string | undefined };

export const pdfQueue = new Queue("pdf-generation", { connection });
export const emailQueue = new Queue("email-sending", { connection });
export const senutoSyncQueue = new Queue("senuto-sync", { connection });
export const gscSyncQueue = new Queue("gsc-sync", { connection });
export const uptimeQueue = new Queue("uptime-monitor", { connection });
export const autoReportQueue = new Queue("auto-reports", { connection });
export const webhookQueue = new Queue("webhook-delivery", { connection });

export async function scheduleSenutoSync(clientId: string, tenantId: string) {
  await senutoSyncQueue.add("sync", { clientId, tenantId }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function scheduleGscSync(clientId: string, tenantId: string) {
  await gscSyncQueue.add("sync", { clientId, tenantId }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function scheduleReportGeneration(reportId: string) {
  await pdfQueue.add("generate", { reportId }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
  });
}

export async function scheduleUptimeCheck(clientId: string) {
  await uptimeQueue.add("check", { clientId }, {
    attempts: 2,
    backoff: { type: "fixed", delay: 3000 },
  });
}

export async function deliverWebhook(webhookId: string, event: string, payload: unknown) {
  await webhookQueue.add("deliver", { webhookId, event, payload }, {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
  });
}
