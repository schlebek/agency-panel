import { Hono } from "hono";
import { db, tenants } from "@agency/db";
import { getPresignedUrl } from "../lib/storage";

const app = new Hono();

// Favicon tenanta — bez auth, używany przez przeglądarkę
app.get("/favicon", async (c) => {
  const [tenant] = await db
    .select({ faviconKey: tenants.faviconKey })
    .from(tenants)
    .limit(1);

  if (!tenant?.faviconKey) {
    return c.notFound();
  }

  const url = await getPresignedUrl(tenant.faviconKey, 3600);
  return c.redirect(url, 302);
});

export default app;
