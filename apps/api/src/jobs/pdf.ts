import { Worker } from "bullmq";
import { db, reports, clients, senutoSnapshots, gscSnapshots, optimizationNotes, linkFiles } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { uploadFile } from "../lib/storage";
import { redis } from "../lib/redis";
export const pdfWorker = new Worker(
  "pdf-generation",
  async (job) => {
    const { reportId } = job.data;

    const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    if (!report) throw new Error(`Report ${reportId} not found`);

    const [client] = await db.select().from(clients).where(eq(clients.id, report.clientId)).limit(1);
    if (!client) throw new Error(`Client not found`);

    const [seoData, gscData, notes, links] = await Promise.all([
      db.select().from(senutoSnapshots)
        .where(and(eq(senutoSnapshots.clientId, client.id)))
        .orderBy(senutoSnapshots.snapshotDate)
        .limit(30),

      db.select().from(gscSnapshots)
        .where(eq(gscSnapshots.clientId, client.id))
        .limit(12),

      db.select().from(optimizationNotes)
        .where(and(
          eq(optimizationNotes.clientId, client.id),
          eq(optimizationNotes.year, report.year),
          eq(optimizationNotes.month, report.month)
        )),

      db.select().from(linkFiles)
        .where(and(
          eq(linkFiles.clientId, client.id),
          eq(linkFiles.year, report.year),
          eq(linkFiles.month, report.month)
        )),
    ]);

    // Generowanie PDF przez Puppeteer
    const { generateReportPdf } = await import("./pdf-generator");
    const pdfBuffer = await generateReportPdf({
      report,
      client,
      seoData,
      gscData,
      notes,
      links,
    });

    const pdfKey = `${client.tenantId}/${client.id}/reports/${report.year}-${String(report.month).padStart(2, "0")}-${reportId}.pdf`;
    await uploadFile(pdfKey, pdfBuffer, "application/pdf");

    await db
      .update(reports)
      .set({ status: "ready", pdfUrl: pdfKey, updatedAt: new Date() })
      .where(eq(reports.id, reportId));

    console.log(`[pdf] Report ${reportId} generated: ${pdfKey}`);
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

pdfWorker.on("failed", async (job, err) => {
  console.error(`[pdf] Job ${job?.id} failed:`, err.message);
  if (job?.data?.reportId) {
    await db.update(reports).set({ status: "failed" }).where(eq(reports.id, job.data.reportId));
  }
});
