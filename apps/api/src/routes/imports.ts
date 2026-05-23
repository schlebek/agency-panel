import { Hono } from "hono";
import { db, clients } from "@agency/db";
import { requireAuth } from "../middleware/auth";
import { scheduleSenutoSync } from "../lib/queue";

const app = new Hono();
app.use("*", requireAuth);

app.post("/clients/import", async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return c.json({ error: "Brak pliku" }, 400);

  const text = await file.text();
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return c.json({ error: "Plik CSV jest pusty lub nieprawidłowy" }, 400);

  // Parsowanie nagłówka
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.replace(/"/g, "").trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const domainIdx = headers.indexOf("domain");
  const emailIdx = headers.indexOf("email");
  const industryIdx = headers.indexOf("industry");
  const typeIdx = headers.indexOf("type");

  if (nameIdx < 0 || domainIdx < 0) {
    return c.json({ error: 'CSV musi zawierać kolumny "name" i "domain"' }, 400);
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.replace(/"/g, "").trim());
    const name = cols[nameIdx];
    const domain = cols[domainIdx];
    if (!name || !domain) { results.skipped++; continue; }

    try {
      const [newClient] = await db.insert(clients).values({
        tenantId: tenant.id,
        name,
        domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        contactEmail: emailIdx >= 0 ? cols[emailIdx] || null : null,
        industry: industryIdx >= 0 ? cols[industryIdx] || null : null,
        clientType: typeIdx >= 0 && cols[typeIdx] === "shop" ? "shop" : "company",
      }).returning({ id: clients.id });

      await scheduleSenutoSync(newClient.id, tenant.id);
      results.created++;
    } catch (err: any) {
      results.errors.push(`Wiersz ${i + 1}: ${err.message}`);
    }
  }

  return c.json(results);
});

export default app;
