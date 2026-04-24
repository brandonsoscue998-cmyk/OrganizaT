import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const availabilityTable = pgTable("availability", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isBooked: boolean("is_booked").notNull().default(false),
  bookedSubSlots: text("booked_sub_slots").notNull().default("[]"),
  sessionId: integer("session_id"),
  clientName: text("client_name"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  weekday: integer("weekday"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Availability = typeof availabilityTable.$inferSelect;
