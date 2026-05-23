import { Hono } from "hono";
import { db, clients, tenants } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getGscQueriesExtended } from "../lib/gsc";

const app = new Hono();
app.use("*", requireAuth);

const AI_KEYWORDS_PL = [
  "dlaczego", "jak ", "co to ", "co jest", "kiedy", "gdzie ",
  "wyjaśnij", "porównaj", "napisz ", "jak zrobić", "jak działa", "czym jest",
  "jakie są", "jak mogę", "czy można", "co powoduje", "co oznacza",
  "jak naprawić", "jak poprawić", "jak usunąć", "jak wybrać", "jaka jest",
  "jak sprawdzić", "co to znaczy", "ile kosztuje", "ile trwa", "co zrobić",
  "jak używać", "jak zainstalować", "co to za", "czy warto", "jak działa",
];

const AI_KEYWORDS_EN = [
  "how to ", "what is ", "why does", "how does", "what are ", "can i ",
  "explain ", "compare ", "difference between", "what causes", "how do i",
  "what does", "when to ", "where to ", "best way to", "step by step",
  "tutorial for", "guide to", "how can i", "why is ", "what happens",
];

function scoreQuery(q: string): number {
  const words = q.split(/\s+/).length;
  const lower = q.toLowerCase();
  const wordScore = words >= 5 ? Math.min((words - 4) * 0.8, 5) : 0;
  const allKw = [...AI_KEYWORDS_PL, ...AI_KEYWORDS_EN];
  const kwHits = allKw.filter((kw) => lower.includes(kw)).length;
  const kwScore = Math.min(kwHits * 2, 4);
  const veryLong = words >= 10 ? 1 : 0;
  return Math.max(0, Math.min(Math.round(wordScore + kwScore + veryLong), 10));
}

// Fetch + filter AI-like queries from GSC
app.get("/:clientId/queries", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  const { minWords = "5", minScore = "3", limit = "100" } = c.req.query();

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);
  if (!client.gscCredentials) return c.json({ error: "GSC not connected" }, 400);
  if (!client.gscPropertyUrl) return c.json({ error: "GSC property URL not set" }, 400);

  const { rows, dateFrom, dateTo } = await getGscQueriesExtended(
    client.gscCredentials as any,
    client.gscPropertyUrl
  );

  const minWordsNum = parseInt(minWords);
  const minScoreNum = parseInt(minScore);
  const limitNum = Math.min(parseInt(limit), 200);

  const filtered = rows
    .filter((row) => {
      const q = row.keys?.[0] ?? "";
      return q.split(/\s+/).length >= minWordsNum;
    })
    .map((row) => {
      const q = row.keys?.[0] ?? "";
      return {
        query: q,
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        avgPosition: row.position ?? 0,
        wordCount: q.split(/\s+/).length,
        aiScore: scoreQuery(q),
      };
    })
    .filter((r) => r.aiScore >= minScoreNum)
    .sort((a, b) => b.aiScore - a.aiScore || b.impressions - a.impressions)
    .slice(0, limitNum);

  return c.json({ queries: filtered, dateFrom, dateTo, totalFetched: rows.length });
});

// Gemini analysis of selected queries
app.post("/:clientId/analyze", async (c) => {
  const tenant = c.get("tenant");
  const { clientId } = c.req.param();
  const body = await c.req.json();
  const queries: string[] = (body.queries ?? []).slice(0, 25);

  if (queries.length === 0) return c.json({ error: "No queries provided" }, 400);

  const [client] = await db
    .select({ id: clients.id, domain: clients.domain })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Client not found" }, 404);

  const [tenantRow] = await db
    .select({ geminiApiKey: tenants.geminiApiKey })
    .from(tenants)
    .where(eq(tenants.id, tenant.id))
    .limit(1);

  const apiKey = tenantRow?.geminiApiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return c.json({ error: "Brak klucza Gemini API — dodaj go w Ustawieniach" }, 400);

  const queryList = queries.map((q, i) => `${i + 1}. "${q}"`).join("\n");

  const prompt = `Jesteś ekspertem SEO specjalizującym się w analizie ruchu z AI i wyszukiwarek. Analizujesz zapytania z Google Search Console dla strony: ${client.domain}

Poniższe zapytania zostały wykryte jako potencjalnie konwersacyjne lub AI-driven (długie, pytające, naturalna mowa):

${queryList}

Dla każdego zapytania odpowiedz w formacie JSON. Zwróć TYLKO tablicę JSON, bez żadnego dodatkowego tekstu:
[
  {
    "query": "treść zapytania dokładnie jak w danych wejściowych",
    "aiPotential": "wysoki" lub "średni" lub "niski",
    "intent": "krótki opis intencji użytkownika, max 90 znaków",
    "suggestion": "konkretna porada co zrobić, żeby lepiej przechwycić ten ruch, max 140 znaków"
  }
]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Gemini error:", err);
    return c.json({ error: "Gemini API error" }, 500);
  }

  const data = (await res.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

  let analysis: any[] = [];
  try {
    analysis = JSON.parse(text);
  } catch {
    analysis = [];
  }

  return c.json({ analysis });
});

export default app;
