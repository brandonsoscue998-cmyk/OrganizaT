import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { clientsTable } from "./clients";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").references(() => usersTable.id, { onDelete: "set null" }),
  type: text("type"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  paid: boolean("paid").notNull().default(false),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  people: integer("people").notNull().default(1),
  isGroup: boolean("is_group").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
