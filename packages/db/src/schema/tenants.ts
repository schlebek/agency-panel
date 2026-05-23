import { pgTable, uuid, text, timestamp, boolean, pgEnum, integer } from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["trial", "starter", "pro", "enterprise"]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: planEnum("plan").default("trial").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  senutoApiKey: text("senuto_api_key"),
  geminiApiKey: text("gemini_api_key"),
  trialEndsAt: timestamp("trial_ends_at"),
  // Branding — identyfikacja wizualna
  logoKey: text("logo_key"),
  faviconKey: text("favicon_key"),
  brandColor: text("brand_color"),
  tagline: text("tagline"),
  // Dane agencji
  website: text("website"),
  phone: text("phone"),
  address: text("address"),
  contactEmail: text("contact_email"),
  nip: text("nip"),
  regon: text("regon"),
  krs: text("krs"),
  bankAccount: text("bank_account"),
  // Social media
  socialLinkedin: text("social_linkedin"),
  socialFacebook: text("social_facebook"),
  socialInstagram: text("social_instagram"),
  // Komunikacja
  emailFooter: text("email_footer"),
  // Auto-raporty miesięczne
  autoReportEnabled: boolean("auto_report_enabled").default(false),
  autoReportDay: integer("auto_report_day").default(1),   // dzień miesiąca
  autoReportEmail: text("auto_report_email"),
  // Alerty o spadkach widoczności
  alertsEnabled: boolean("alerts_enabled").default(false),
  alertThreshold: integer("alert_threshold").default(10), // % spadku top10
  alertEmail: text("alert_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
