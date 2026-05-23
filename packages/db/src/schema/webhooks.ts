import { pgTable, uuid, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const WEBHOOK_EVENTS = [
  "client.created",
  "client.updated",
  "report.sent",
  "visibility.drop",
  "uptime.down",
  "uptime.recovered",
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: jsonb("events").$type<WebhookEvent[]>().default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
