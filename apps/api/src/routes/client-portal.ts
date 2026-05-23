import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, clientAccounts, clientSessions, clients, clientComments } from "@agency/db";
import { eq, and, desc } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";
import jwt from "jsonwebtoken";
import { addDays } from "date-fns";

const app = new Hono();
const JWT_SECRET = process.env.BETTER_AUTH_SECRET!;

function signClientToken(payload: { clientAccountId: string; clientId: string; tenantId: string }) {
  return jwt.sign({ ...payload, type: "client" }, JWT_SECRET, { expiresIn: "30d" });
}

function verifyClientToken(token: string) {
  try {
    const p = jwt.verify(token, JWT_SECRET) as any;
    if (p.type !== "client") return null;
    return p as { clientAccountId: string; clientId: string; tenantId: string };
  } catch {
    return null;
  }
}

async function requireClientAuth(c: any, next: any) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? c.req.header("x-client-token");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const payload = verifyClientToken(token);
  if (!payload) return c.json({ error: "Unauthorized" }, 401);

  const [session] = await db
    .select()
    .from(clientSessions)
    .where(and(eq(clientSessions.token, token), eq(clientSessions.clientAccountId, payload.clientAccountId)))
    .limit(1);
  if (!session || session.expiresAt < new Date()) return c.json({ error: "Session expired" }, 401);

  const [account] = await db
    .select()
    .from(clientAccounts)
    .where(and(eq(clientAccounts.id, payload.clientAccountId), eq(clientAccounts.isActive, true)))
    .limit(1);
  if (!account) return c.json({ error: "Account disabled" }, 403);

  c.set("clientAccount", account);
  await next();
}

app.post("/login", zValidator("json", z.object({
  email: z.string().email(),
  password: z.string(),
})), async (c) => {
  const { email, password } = c.req.valid("json");

  const [account] = await db
    .select()
    .from(clientAccounts)
    .where(eq(clientAccounts.email, email))
    .limit(1);

  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    return c.json({ error: "Nieprawidłowe dane logowania" }, 401);
  }
  if (!account.isActive) return c.json({ error: "Konto jest nieaktywne" }, 403);

  const token = signClientToken({ clientAccountId: account.id, clientId: account.clientId, tenantId: account.tenantId });
  const expiresAt = addDays(new Date(), 30);

  await db.insert(clientSessions).values({ clientAccountId: account.id, token, expiresAt });
  await db.update(clientAccounts).set({ lastLoginAt: new Date() }).where(eq(clientAccounts.id, account.id));

  const [client] = await db.select().from(clients).where(eq(clients.id, account.clientId)).limit(1);

  return c.json({
    token,
    account: { id: account.id, email: account.email, name: account.name, clientId: account.clientId, tenantId: account.tenantId },
    client: client ? { id: client.id, name: client.name, domain: client.domain, logoUrl: client.logoUrl, tabVisibility: client.tabVisibility } : null,
  });
});

app.get("/me", requireClientAuth, async (c) => {
  const account = c.get("clientAccount");
  const [client] = await db.select().from(clients).where(eq(clients.id, account.clientId)).limit(1);
  return c.json({
    account: { id: account.id, email: account.email, name: account.name, clientId: account.clientId, tenantId: account.tenantId },
    client: client ? { id: client.id, name: client.name, domain: client.domain, logoUrl: client.logoUrl, tabVisibility: client.tabVisibility } : null,
  });
});

app.post("/logout", requireClientAuth, async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "") ?? c.req.header("x-client-token");
  if (token) await db.delete(clientSessions).where(eq(clientSessions.token, token));
  return c.json({ success: true });
});

// Dane portalu klienta — prace, optymalizacja, blogi itd.
app.get("/data", requireClientAuth, async (c) => {
  const account = c.get("clientAccount");
  const { clientId, tenantId } = account;

  const { optimizationNotes, blogBriefs, linkFiles } = await import("@agency/db");
  const { desc } = await import("drizzle-orm");

  const [notes, briefs, links] = await Promise.all([
    db.select().from(optimizationNotes)
      .where(and(eq(optimizationNotes.clientId, clientId), eq(optimizationNotes.tenantId, tenantId)))
      .orderBy(desc(optimizationNotes.createdAt))
      .limit(20),
    db.select().from(blogBriefs)
      .where(and(eq(blogBriefs.clientId, clientId), eq(blogBriefs.tenantId, tenantId)))
      .orderBy(desc(blogBriefs.createdAt)),
    db.select().from(linkFiles)
      .where(and(eq(linkFiles.clientId, clientId), eq(linkFiles.tenantId, tenantId)))
      .orderBy(desc(linkFiles.createdAt))
      .limit(10),
  ]);

  return c.json({ notes, briefs, links });
});

// SEO history (Senuto) — ostatnie 12 miesięcy, jeden snapshot na miesiąc
app.get("/seo-history", requireClientAuth, async (c) => {
  const account = c.get("clientAccount");
  const { clientId } = account;
  const { senutoSnapshots } = await import("@agency/db");
  const { desc } = await import("drizzle-orm");

  const rows = await db.select({
    snapshotDate: senutoSnapshots.snapshotDate,
    top3: senutoSnapshots.top3,
    top10: senutoSnapshots.top10,
    top50: senutoSnapshots.top50,
  })
    .from(senutoSnapshots)
    .where(eq(senutoSnapshots.clientId, clientId))
    .orderBy(desc(senutoSnapshots.snapshotDate))
    .limit(400);

  const byMonth = new Map<string, any>();
  for (const s of rows) {
    const month = s.snapshotDate.toISOString().substring(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, { month, top3: s.top3, top10: s.top10, top50: s.top50 });
  }

  const history = Array.from(byMonth.values())
    .sort((a: any, b: any) => a.month.localeCompare(b.month))
    .slice(-12);

  return c.json({ history });
});

// GSC history — ostatnie snapshoty dla wykresu ruchu
app.get("/gsc-history", requireClientAuth, async (c) => {
  const account = c.get("clientAccount");
  const { clientId } = account;
  const { gscSnapshots } = await import("@agency/db");
  const { desc } = await import("drizzle-orm");

  const rows = await db.select({
    dateTo: gscSnapshots.dateTo,
    clicks: gscSnapshots.clicks,
    impressions: gscSnapshots.impressions,
  })
    .from(gscSnapshots)
    .where(eq(gscSnapshots.clientId, clientId))
    .orderBy(desc(gscSnapshots.dateTo))
    .limit(12);

  const history = rows.reverse().map((s) => ({
    month: new Date(s.dateTo).toISOString().substring(0, 7),
    clicks: s.clicks ?? 0,
    impressions: s.impressions ?? 0,
  }));

  return c.json({ history });
});

// GSC monthly data — dane dla wybranego miesiąca z porównaniami
app.get("/gsc-data", requireClientAuth, async (c) => {
  const account = c.get("clientAccount");
  const { clientId } = account;
  const month = c.req.query("month") ?? new Date().toISOString().substring(0, 7);

  const { gscSnapshots, gscTopPages, gscTopQueries } = await import("@agency/db");
  const { desc, gte, lte } = await import("drizzle-orm");

  const allSnaps = await db.select()
    .from(gscSnapshots)
    .where(eq(gscSnapshots.clientId, clientId))
    .orderBy(desc(gscSnapshots.dateTo))
    .limit(50);

  function findForMonth(m: string) {
    const [y, mo] = m.split("-").map(Number);
    const start = new Date(y, mo - 1, 1);
    const end = new Date(y, mo, 0, 23, 59, 59);
    const inMonth = allSnaps.find((s) => {
      const d = new Date(s.dateTo);
      return d >= start && d <= end;
    });
    if (inMonth) return inMonth;
    return allSnaps.find((s) => new Date(s.dateTo) <= end) ?? null;
  }

  function toObj(s: any) {
    if (!s) return null;
    return {
      clicks: s.clicks ?? 0,
      impressions: s.impressions ?? 0,
      ctr: parseFloat(s.ctr ?? "0"),
      avgPosition: parseFloat(s.avgPosition ?? "0"),
    };
  }

  const [y, mo] = month.split("-").map(Number);
  const prevMonth = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
  const yearAgoMonth = `${y - 1}-${String(mo).padStart(2, "0")}`;

  const currentSnap = findForMonth(month);
  const prevSnap = findForMonth(prevMonth);
  const yearAgoSnap = findForMonth(yearAgoMonth);

  let queries: any[] = [];
  let pages: any[] = [];

  if (currentSnap) {
    const d = new Date(currentSnap.dateTo);
    const from = new Date(d); from.setDate(from.getDate() - 1);
    const to = new Date(d); to.setDate(to.getDate() + 2);

    [queries, pages] = await Promise.all([
      db.select().from(gscTopQueries)
        .where(and(eq(gscTopQueries.clientId, clientId), gte(gscTopQueries.snapshotDate, from), lte(gscTopQueries.snapshotDate, to)))
        .orderBy(desc(gscTopQueries.clicks)).limit(10),
      db.select().from(gscTopPages)
        .where(and(eq(gscTopPages.clientId, clientId), gte(gscTopPages.snapshotDate, from), lte(gscTopPages.snapshotDate, to)))
        .orderBy(desc(gscTopPages.clicks)).limit(10),
    ]);
  }

  return c.json({
    month,
    current: toObj(currentSnap),
    previous: toObj(prevSnap),
    yearAgo: toObj(yearAgoSnap),
    queries: queries.map((q) => ({ query: q.query, clicks: q.clicks, impressions: q.impressions, ctr: parseFloat(q.ctr ?? "0"), avgPosition: parseFloat(q.avgPosition ?? "0") })),
    pages: pages.map((p) => ({ page: p.page, clicks: p.clicks, impressions: p.impressions, ctr: parseFloat(p.ctr ?? "0"), avgPosition: parseFloat(p.avgPosition ?? "0") })),
  });
});

// Comments via portal
app.get("/comments", requireClientAuth, async (c) => {
  const account = c.get("clientAccount");
  const comments = await db.select().from(clientComments)
    .where(and(eq(clientComments.clientId, account.clientId), eq(clientComments.tenantId, account.tenantId)))
    .orderBy(desc(clientComments.createdAt))
    .limit(50);
  return c.json(comments);
});

app.post("/comments", requireClientAuth, zValidator("json", z.object({
  content: z.string().min(1).max(2000),
})), async (c) => {
  const account = c.get("clientAccount");
  const { content } = c.req.valid("json");
  const [comment] = await db.insert(clientComments).values({
    tenantId: account.tenantId,
    clientId: account.clientId,
    authorType: "client",
    authorId: account.id,
    authorName: account.name,
    content,
  }).returning();
  return c.json(comment, 201);
});

export { requireClientAuth };
export default app;
