import { pgTable, uuid, text, timestamp, integer, numeric, jsonb, index } from "drizzle-orm/pg-core";
import { clients } from "./clients";

// Cache danych z Senuto (odświeżane co 24h przez job)
export const senutoSnapshots = pgTable("senuto_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  // Visibility summary
  top3: integer("top3"),
  top10: integer("top10"),
  top50: integer("top50"),
  top100: integer("top100"),
  totalKeywords: integer("total_keywords"),
  visibilityIndex: numeric("visibility_index", { precision: 10, scale: 4 }),
  // Raw data z API
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("senuto_snapshots_client_date_idx").on(t.clientId, t.snapshotDate),
]);

// Top keywords + biggest changes
export const senutoKeywords = pgTable("senuto_keywords", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  keyword: text("keyword").notNull(),
  position: integer("position"),
  previousPosition: integer("previous_position"),
  positionChange: integer("position_change"),
  searchVolume: integer("search_volume"),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("senuto_keywords_client_date_idx").on(t.clientId, t.snapshotDate),
]);

// Cache danych z GSC (odświeżane co 24h)
export const gscSnapshots = pgTable("gsc_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  dateFrom: timestamp("date_from").notNull(),
  dateTo: timestamp("date_to").notNull(),
  clicks: integer("clicks"),
  impressions: integer("impressions"),
  ctr: numeric("ctr", { precision: 8, scale: 6 }),
  avgPosition: numeric("avg_position", { precision: 8, scale: 4 }),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("gsc_snapshots_client_idx").on(t.clientId),
]);

export const gscTopPages = pgTable("gsc_top_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  page: text("page").notNull(),
  clicks: integer("clicks"),
  impressions: integer("impressions"),
  ctr: numeric("ctr", { precision: 8, scale: 6 }),
  avgPosition: numeric("avg_position", { precision: 8, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gscTopQueries = pgTable("gsc_top_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  query: text("query").notNull(),
  clicks: integer("clicks"),
  impressions: integer("impressions"),
  ctr: numeric("ctr", { precision: 8, scale: 6 }),
  avgPosition: numeric("avg_position", { precision: 8, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SenutoSnapshot = typeof senutoSnapshots.$inferSelect;
export type SenutoKeyword = typeof senutoKeywords.$inferSelect;
export type GscSnapshot = typeof gscSnapshots.$inferSelect;
