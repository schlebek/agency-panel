import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { clients } from "./clients";

export const clientComments = pgTable("client_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  authorType: text("author_type").$type<"agency" | "client">().notNull(),
  authorId: uuid("author_id").notNull(),   // userId lub clientAccountId
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  parentId: uuid("parent_id"),             // threading (odpowiedź na komentarz)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ClientComment = typeof clientComments.$inferSelect;
