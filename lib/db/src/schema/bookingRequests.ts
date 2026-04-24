import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { availabilityTable } from "./availability";

export const bookingRequestsTable = pgTable("booking_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  date: timestamp("date", { withTimezone: true }).notNull(),
  slotId: integer("slot_id").references(() => availabilityTable.id, { onDelete: "set null" }),
  slotStartTime: text("slot_start_time"),
  people: integer("people").notNull().default(1),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BookingRequest = typeof bookingRequestsTable.$inferSelect;
