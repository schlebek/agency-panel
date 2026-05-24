import { db, clients, tenants, senutoSnapshots } from "@agency/db";
import { eq, desc } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

async function checkVisibilityDrops() {
  try {
    const [tenant] = await db.select().from(tenants).limit(1);
    if (!tenant?.alertsEnabled || !tenant.alertEmail) return;

    const threshold = tenant.alertThreshold ?? 10;
    const activeClients = await db.select({ id: clients.id, name: clients.name, domain: clients.domain })
      .from(clients).where(eq(clients.isActive, true));

    const alerts: { name: string; domain: string; drop: number; current: number; previous: number }[] = [];

    for (const client of activeClients) {
      const snapshots = await db.select()
        .from(senutoSnapshots)
        .where(eq(senutoSnapshots.clientId, client.id))
        .orderBy(desc(senutoSnapshots.snapshotDate))
        .limit(2);

      if (snapshots.length < 2) continue;
      const [current, previous] = snapshots;
      const curr = current.top10 ?? 0;
      const prev = previous.top10 ?? 0;
      if (prev === 0) continue;

      const dropPct = ((prev - curr) / prev) * 100;
      if (dropPct >= threshold) {
        alerts.push({ name: client.name, domain: client.domain, drop: Math.round(dropPct), current: curr, previous: prev });
      }
    }

    if (alerts.length === 0) return;

    const rows = alerts.map(a =>
      `<tr><td>${a.name}</td><td>${a.domain}</td><td>${a.previous}</td><td>${a.current}</td><td style="color:red">-${a.drop}%</td></tr>`
    ).join("");

    await resend.emails.send({
      from: "noreply@agencypanel.pl",
      to: tenant.alertEmail,
      subject: `⚠️ Alerty SEO — ${alerts.length} klientów ze spadkiem widoczności`,
      html: `
        <h2>Alerty o spadkach widoczności (≥${threshold}%)</h2>
        <table border="1" cellpadding="8" style="border-collapse:collapse">
          <thead><tr><th>Klient</th><th>Domena</th><th>Top10 poprzednio</th><th>Top10 teraz</th><th>Spadek</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#666;font-size:12px">Agency Panel — automatyczny alert</p>
      `,
    });

    console.log(`[visibility-alerts] Sent alert for ${alerts.length} clients`);
  } catch (err) {
    console.error("[visibility-alerts] Error:", err);
  }
}

// Co 24h po syncach
setTimeout(checkVisibilityDrops, 60_000);
setInterval(checkVisibilityDrops, 24 * 60 * 60 * 1_000);
