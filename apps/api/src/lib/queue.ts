import { Queue, Worker } from "bullmq";
import { redis } from "./redis";

const connection = { host: redis.options.host, port: redis.options.port as number };

export const pdfQueue = new Queue("pdf-generation", { connection });
export const emailQueue = new Queue("email-sending", { connection });
export const senutoSyncQueue = new Queue("senuto-sync", { connection });
export const gscSyncQueue = new Queue("gsc-sync", { connection });

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
