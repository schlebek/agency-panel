import { pgTable, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { clients } from "./clients";
import { index } from "drizzle-orm/pg-core";

export const uptimeChecks = pgTable("uptime_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
  status: text("status").$type<"up" | "down" | "timeout">().notNull(),
  statusCode: integer("status_code"),
  responseTimeMs: integer("response_time_ms"),
  errorMessage: text("error_message"),
}, (t) => [
  index("uptime_checks_client_idx").on(t.clientId, t.checkedAt),
]);

export type UptimeCheck = typeof uptimeChecks.$inferSelect;
