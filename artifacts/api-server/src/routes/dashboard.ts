import { Router, type IRouter } from "express";
import { eq, and, gte, lte, gt, inArray, sql } from "drizzle-orm";
import { db, sessionsTable, clientsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [{ totalClients }] = await db
    .select({ totalClients: sql<number>`count(*)::int` })
    .from(clientsTable)
    .where(eq(clientsTable.userId, userId));

  const [{ totalSessions }] = await db
    .select({ totalSessions: sql<number>`count(*)::int` })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId));

  const [{ weeklySessions }] = await db
    .select({ weeklySessions: sql<number>`count(*)::int` })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), gte(sessionsTable.date, startOfWeek)));

  const [monthlyRow] = await db
    .select({ monthlyRevenue: sql<number>`coalesce(sum(price::numeric), 0)` })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.userId, userId),
        gte(sessionsTable.date, startOfMonth),
        eq(sessionsTable.status, "completed")
      )
    );

  const [unpaidRow] = await db
    .select({ unpaidRevenue: sql<number>`coalesce(sum(price::numeric), 0)` })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), eq(sessionsTable.paid, false)));

  res.json({
    totalClients: Number(totalClients),
    totalSessions: Number(totalSessions),
    weeklySessions: Number(weeklySessions),
    monthlyRevenue: Number(monthlyRow.monthlyRevenue),
    unpaidRevenue: Number(unpaidRow.unpaidRevenue),
  });
});

router.get("/dashboard/monthly-revenue", async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', date), 'Mon YYYY')`,
      revenue: sql<number>`coalesce(sum(case when status = 'completed' then price::numeric else 0 end), 0)`,
      sessions: sql<number>`count(*)::int`,
    })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), gte(sessionsTable.date, sixMonthsAgo)))
    .groupBy(sql`date_trunc('month', date)`)
    .orderBy(sql`date_trunc('month', date)`);

  res.json(rows.map(r => ({ month: r.month, revenue: Number(r.revenue), sessions: Number(r.sessions) })));
});

router.get("/dashboard/recent-sessions", async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const rows = await db
    .select({
      id: sessionsTable.id,
      userId: sessionsTable.userId,
      clientId: sessionsTable.clientId,
      clientName: clientsTable.name,
      date: sessionsTable.date,
      status: sessionsTable.status,
      price: sessionsTable.price,
      paid: sessionsTable.paid,
      notes: sessionsTable.notes,
      createdAt: sessionsTable.createdAt,
      updatedAt: sessionsTable.updatedAt,
    })
    .from(sessionsTable)
    .leftJoin(clientsTable, eq(sessionsTable.clientId, clientsTable.id))
    .where(eq(sessionsTable.userId, userId))
    .orderBy(sql`date desc`)
    .limit(10);

  res.json(rows.map(r => ({ ...r, price: Number(r.price) })));
});

router.get("/alerts", async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const now = new Date();

  const lowSessionClients = await db
    .select({ id: clientsTable.id, name: clientsTable.name, remainingSessions: clientsTable.remainingSessions })
    .from(clientsTable)
    .where(and(
      eq(clientsTable.userId, userId),
      gt(clientsTable.remainingSessions, 0),
      lte(clientsTable.remainingSessions, 2),
      gt(clientsTable.totalSessions, 0),
    ));

  const clientsWithUpcoming = await db
    .selectDistinct({ clientId: sessionsTable.clientId })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), gt(sessionsTable.date, now)));

  const clientsWithAny = await db
    .selectDistinct({ clientId: sessionsTable.clientId })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId));

  const upcomingSet = new Set(clientsWithUpcoming.map(r => r.clientId));
  const noUpcomingIds = clientsWithAny
    .filter(r => r.clientId !== null && !upcomingSet.has(r.clientId))
    .map(r => r.clientId as number);

  const noUpcomingSessions = noUpcomingIds.length > 0
    ? await db
        .select({ id: clientsTable.id, name: clientsTable.name })
        .from(clientsTable)
        .where(and(eq(clientsTable.userId, userId), inArray(clientsTable.id, noUpcomingIds)))
    : [];

  const [unpaidRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionsTable)
    .where(and(eq(sessionsTable.userId, userId), eq(sessionsTable.paid, false)));

  res.json({
    lowSessions: lowSessionClients,
    noUpcomingSessions,
    unpaidSessions: Number(unpaidRow.count),
  });
});

export default router;
