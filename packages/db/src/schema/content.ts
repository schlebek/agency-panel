import { pgTable, uuid, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { tenants } from "./tenants";
import { users } from "./users";

export const noteTypeEnum = pgEnum("note_type", ["optimization", "text", "brief", "link_building", "technical", "other"]);

// Prace optymalizacyjne, briefy, teksty wdrożone w danym miesiącu
export const optimizationNotes = pgTable("optimization_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  type: noteTypeEnum("type").default("optimization").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pliki z pozyskanymi linkami (CSV, Excel)
export const linkFiles = pgTable("link_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  filename: text("filename").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  description: text("description"),
  linksCount: integer("links_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Briefy blogowe
export const blogBriefs = pgTable("blog_briefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  briefUrl: text("brief_url"),
  status: text("status").$type<"pending" | "sent" | "published">().default("pending").notNull(),
  publishUrl: text("publish_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OptimizationNote = typeof optimizationNotes.$inferSelect;
export type NewOptimizationNote = typeof optimizationNotes.$inferInsert;
export type LinkFile = typeof linkFiles.$inferSelect;
export type NewLinkFile = typeof linkFiles.$inferInsert;
export type BlogBrief = typeof blogBriefs.$inferSelect;
export type NewBlogBrief = typeof blogBriefs.$inferInsert;
