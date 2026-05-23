import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, tenants } from "@agency/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { SenutoClient } from "../lib/senuto";
import { uploadFile, getPresignedUrl, deleteFile } from "../lib/storage";

const app = new Hono();

app.use("*", requireAuth);

app.get("/", async (c) => {
  const tenant = c.get("tenant");
  const [t] = await db.select().from(tenants).where(eq(tenants.id, tenant.id)).limit(1);
  if (!t) return c.json({ error: "Tenant not found" }, 404);

  const [logoUrl, faviconUrl] = await Promise.all([
    t.logoKey    ? getPresignedUrl(t.logoKey,    86400) : Promise.resolve(null),
    t.faviconKey ? getPresignedUrl(t.faviconKey, 86400) : Promise.resolve(null),
  ]);

  return c.json({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    isActive: t.isActive,
    trialEndsAt: t.trialEndsAt,
    hasSenutoKey: !!t.senutoApiKey,
    senutoApiKey: t.senutoApiKey ? "••••••••" + t.senutoApiKey.slice(-4) : null,
    hasGeminiKey: !!t.geminiApiKey,
    geminiApiKey: t.geminiApiKey ? "••••••••" + t.geminiApiKey.slice(-4) : null,
    // Identyfikacja wizualna
    logoUrl,
    hasLogo: !!t.logoKey,
    faviconUrl,
    hasFavicon: !!t.faviconKey,
    brandColor: t.brandColor ?? "#4F46E5",
    tagline: t.tagline ?? "",
    // Dane agencji
    website: t.website ?? "",
    phone: t.phone ?? "",
    address: t.address ?? "",
    contactEmail: t.contactEmail ?? "",
    nip: t.nip ?? "",
    regon: t.regon ?? "",
    krs: t.krs ?? "",
    bankAccount: t.bankAccount ?? "",
    // Social media
    socialLinkedin: t.socialLinkedin ?? "",
    socialFacebook: t.socialFacebook ?? "",
    socialInstagram: t.socialInstagram ?? "",
    // Komunikacja
    emailFooter: t.emailFooter ?? "",
    // Auto-raporty
    autoReportEnabled: t.autoReportEnabled ?? false,
    autoReportDay: t.autoReportDay ?? 1,
    autoReportEmail: t.autoReportEmail ?? "",
    // Alerty
    alertsEnabled: t.alertsEnabled ?? false,
    alertThreshold: t.alertThreshold ?? 10,
    alertEmail: t.alertEmail ?? "",
  });
});

const updateSchema = z.object({
  // Konfiguracja
  name: z.string().min(2).max(100).optional(),
  senutoLogin: z.string().email().optional(),
  senutoPassword: z.string().min(1).optional(),
  geminiApiKey: z.string().min(1).optional(),
  // Identyfikacja wizualna
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Nieprawidłowy kolor hex").optional(),
  tagline: z.string().max(200).optional(),
  // Dane agencji
  website: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  nip: z.string().max(20).optional(),
  regon: z.string().max(20).optional(),
  krs: z.string().max(20).optional(),
  bankAccount: z.string().max(50).optional(),
  // Social media
  socialLinkedin: z.string().max(255).optional(),
  socialFacebook: z.string().max(255).optional(),
  socialInstagram: z.string().max(255).optional(),
  // Komunikacja
  emailFooter: z.string().max(1000).optional(),
  // Auto-raporty
  autoReportEnabled: z.union([z.boolean(), z.string().transform((s) => s === "true")]).optional(),
  autoReportDay: z.union([z.number().int().min(1).max(28), z.string().transform((s) => parseInt(s))]).optional(),
  autoReportEmail: z.string().max(255).optional(),
  // Alerty
  alertsEnabled: z.union([z.boolean(), z.string().transform((s) => s === "true")]).optional(),
  alertThreshold: z.union([z.number().int().min(1).max(100), z.string().transform((s) => parseInt(s))]).optional(),
  alertEmail: z.string().max(255).optional(),
});

app.put("/", zValidator("json", updateSchema), async (c) => {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const body = c.req.valid("json");
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  const textFields = [
    "name", "brandColor", "tagline",
    "website", "phone", "address", "contactEmail", "nip", "regon", "krs", "bankAccount",
    "socialLinkedin", "socialFacebook", "socialInstagram",
    "emailFooter",
  ] as const;

  for (const field of textFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field] || null;
    }
  }

  if (body.geminiApiKey) updates.geminiApiKey = body.geminiApiKey;

  // Auto-raporty i alerty
  if (body.autoReportEnabled !== undefined) updates.autoReportEnabled = body.autoReportEnabled;
  if (body.autoReportDay !== undefined) updates.autoReportDay = body.autoReportDay;
  if (body.autoReportEmail !== undefined) updates.autoReportEmail = body.autoReportEmail || null;
  if (body.alertsEnabled !== undefined) updates.alertsEnabled = body.alertsEnabled;
  if (body.alertThreshold !== undefined) updates.alertThreshold = body.alertThreshold;
  if (body.alertEmail !== undefined) updates.alertEmail = body.alertEmail || null;

  if (body.senutoLogin && body.senutoPassword) {
    try {
      updates.senutoApiKey = await SenutoClient.authenticate(body.senutoLogin, body.senutoPassword);
    } catch {
      return c.json({ error: "Nieprawidłowy login lub hasło Senuto" }, 400);
    }
  }

  await db.update(tenants).set(updates).where(eq(tenants.id, tenant.id));
  return c.json({ success: true });
});

// ─── Logo ─────────────────────────────────────────────────────────────────────
const LOGO_MIME = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

app.post("/logo", async (c) => {
  const { tenant, error } = await requireOwnerOrAdmin(c);
  if (error) return error;

  const { file, err } = await parseImageUpload(c, "logo", LOGO_MIME, 2 * 1024 * 1024);
  if (err) return err;

  const ext = getExt(file!.type);
  const key = `logos/${tenant.id}.${ext}`;

  await replaceFile(tenant.id, "logoKey", key, file!, c);
  const logoUrl = await getPresignedUrl(key, 86400);
  return c.json({ logoUrl });
});

app.delete("/logo", async (c) => {
  const { tenant, error } = await requireOwnerOrAdmin(c);
  if (error) return error;
  await removeFile(tenant.id, "logoKey");
  return c.json({ success: true });
});

// ─── Favicon ──────────────────────────────────────────────────────────────────
const FAVICON_MIME = ["image/png", "image/x-icon", "image/svg+xml", "image/webp"];

app.post("/favicon", async (c) => {
  const { tenant, error } = await requireOwnerOrAdmin(c);
  if (error) return error;

  const { file, err } = await parseImageUpload(c, "favicon", FAVICON_MIME, 512 * 1024);
  if (err) return err;

  const ext = getExt(file!.type);
  const key = `favicons/${tenant.id}.${ext}`;

  await replaceFile(tenant.id, "faviconKey", key, file!, c);
  const faviconUrl = await getPresignedUrl(key, 86400);
  return c.json({ faviconUrl });
});

app.delete("/favicon", async (c) => {
  const { tenant, error } = await requireOwnerOrAdmin(c);
  if (error) return error;
  await removeFile(tenant.id, "faviconKey");
  return c.json({ success: true });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function requireOwnerOrAdmin(c: any) {
  const tenant = c.get("tenant");
  const user = c.get("user");
  if (user.role !== "owner" && user.role !== "admin") {
    return { tenant: null, error: c.json({ error: "Forbidden" }, 403) };
  }
  return { tenant, error: null };
}

async function parseImageUpload(c: any, field: string, allowedMime: string[], maxSize: number) {
  const formData = await c.req.formData();
  const file = formData.get(field) as File | null;
  if (!file) return { file: null, err: c.json({ error: "Brak pliku" }, 400) };
  if (!allowedMime.includes(file.type)) {
    return { file: null, err: c.json({ error: `Niedozwolony format pliku` }, 400) };
  }
  if (file.size > maxSize) {
    return { file: null, err: c.json({ error: `Plik jest za duży (maks. ${Math.round(maxSize / 1024)} KB)` }, 400) };
  }
  return { file, err: null };
}

function getExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/x-icon": "ico",
  };
  return map[mimeType] ?? "png";
}

async function replaceFile(tenantId: string, keyField: string, newKey: string, file: File, c: any) {
  const [current] = await db
    .select({ key: (tenants as any)[keyField] })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (current?.key && current.key !== newKey) {
    await deleteFile(current.key).catch(() => {});
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadFile(newKey, buffer, file.type);
  await db.update(tenants).set({ [keyField]: newKey, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
}

async function removeFile(tenantId: string, keyField: string) {
  const [current] = await db
    .select({ key: (tenants as any)[keyField] })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (current?.key) {
    await deleteFile(current.key).catch(() => {});
    await db.update(tenants).set({ [keyField]: null, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
  }
}

export default app;
