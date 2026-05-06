import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, clients } from "@agency/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const app = new Hono();
app.use("*", requireAuth);

// PATCH /clients/:id/optimization — zapisuje stan checkboxów
app.patch("/:id/optimization", zValidator("json", z.object({
  checklist: z.record(z.string(), z.boolean()),
})), async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();
  const { checklist } = c.req.valid("json");

  const [client] = await db
    .update(clients)
    .set({ optimizationChecklist: checklist, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.tenantId, tenant.id)))
    .returning({ id: clients.id, optimizationChecklist: clients.optimizationChecklist });

  if (!client) return c.json({ error: "Not found" }, 404);
  return c.json(client);
});

// POST /clients/:id/detect-engine — auto-detekcja silnika CMS
app.post("/:id/detect-engine", async (c) => {
  const tenant = c.get("tenant");
  const { id } = c.req.param();

  const [client] = await db
    .select({ id: clients.id, domain: clients.domain })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.tenantId, tenant.id)))
    .limit(1);

  if (!client) return c.json({ error: "Not found" }, 404);

  try {
    const url = `https://${client.domain.replace(/^https?:\/\//, "")}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SEO-Bot/1.0)" },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });

    const html = await response.text();
    const powered = response.headers.get("x-powered-by") ?? "";
    const generator = html.match(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? "";

    let engine: string | null = null;

    if (/wordpress/i.test(generator) || html.includes("/wp-content/") || html.includes("/wp-json/")) {
      engine = "WordPress";
    } else if (/prestashop/i.test(html) || html.includes("/modules/ps_") || html.includes("prestashop")) {
      engine = "PrestaShop";
    } else if (html.includes("cdn.shopify.com") || html.includes("myshopify.com")) {
      engine = "Shopify";
    } else if (/joomla/i.test(generator) || html.includes("Joomla!")) {
      engine = "Joomla";
    } else if (/drupal/i.test(generator) || html.includes("Drupal.settings")) {
      engine = "Drupal";
    } else if (html.includes("static.squarespace.com")) {
      engine = "Squarespace";
    } else if (html.includes("wix.com") || html.includes("_wix_")) {
      engine = "Wix";
    } else if (/magento/i.test(html) || html.includes("Magento_")) {
      engine = "Magento";
    } else if (/php/i.test(powered)) {
      engine = "PHP (nieokreślony)";
    }

    if (engine) {
      await db
        .update(clients)
        .set({ engine, updatedAt: new Date() })
        .where(eq(clients.id, id));
    }

    return c.json({ engine, detected: !!engine });
  } catch (err) {
    return c.json({ engine: null, detected: false, error: "Nie udało się pobrać strony" });
  }
});

export default app;
