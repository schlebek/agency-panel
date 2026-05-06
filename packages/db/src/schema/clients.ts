import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  logoUrl: text("logo_url"),
  contactEmail: text("contact_email"),
  isActive: boolean("is_active").default(true).notNull(),
  // Klasyfikacja klienta
  clientType: text("client_type").$type<"shop" | "company">().default("company"),
  industry: text("industry"),
  engine: text("engine"), // WordPress, PrestaShop, Shopify, itd.
  // Optymalizacja SEO — mapa checkboxów { [key]: boolean }
  optimizationChecklist: jsonb("optimization_checklist").$type<Record<string, boolean>>().default({}),
  // Widoczność zakładek w portalu klienta { seo: true, gsc: false, ... }
  tabVisibility: jsonb("tab_visibility").$type<Record<string, boolean>>().default({}),
  // Senuto
  senutoProjectId: text("senuto_project_id"),
  senutoApiKey: text("senuto_api_key"),
  // GSC
  gscPropertyUrl: text("gsc_property_url"),
  gscCredentials: jsonb("gsc_credentials"),
  // Google Ads
  googleAdsCustomerId: text("google_ads_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
