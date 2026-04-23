import { Router, type IRouter } from "express";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { db, availabilityTable, clientsTable, sessionsTable } from "@workspace/db";
import {
  CreateAvailabilityBody,
  BookAvailabilityBody,
  DeleteAvailabilityParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/availability", async (req, res): Promise<void> => {
  const { from, to } = req.query;

  const conditions: SQL[] = [eq(availabilityTable.userId, req.user!.userId)];
  if (from && typeof from === "string") conditions.push(gte(availabilityTable.date, from));
  if (to && typeof to === "string") conditions.push(lte(availabilityTable.date, to));

  const slots = await db
    .select()
    .from(availabilityTable)
    .where(and(...conditions))
    .orderBy(availabilityTable.date, availabilityTable.startTime);

  res.json(slots);
});

router.post("/availability", async (req, res): Promise<void> => {
  const parsed = CreateAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, startTime, endTime } = parsed.data;

  if (endTime <= startTime) {
    res.status(400).json({ error: "La hora de fin debe ser posterior a la de inicio" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  if (date < today) {
    res.status(400).json({ error: "No puedes crear disponibilidad en el pasado" });
    return;
  }

  const existing = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.userId, req.user!.userId), eq(availabilityTable.date, date)));

  const hasOverlap = existing.some(s => startTime < s.endTime && endTime > s.startTime);
  if (hasOverlap) {
    res.status(400).json({ error: "El horario se solapa con un slot existente" });
    return;
  }

  const [slot] = await db
    .insert(availabilityTable)
    .values({ userId: req.user!.userId, date, startTime, endTime })
    .returning();

  res.status(201).json(slot);
});

router.delete("/availability/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAvailabilityParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [slot] = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.id, params.data.id), eq(availabilityTable.userId, req.user!.userId)));

  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  if (slot.isBooked) {
    res.status(400).json({ error: "No puedes eliminar un slot ya reservado" });
    return;
  }

  await db.delete(availabilityTable).where(eq(availabilityTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/availability/:id/book", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = BookAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clientId, price: manualPrice } = parsed.data;

  const [slot] = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.id, id), eq(availabilityTable.userId, req.user!.userId)));

  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  if (slot.isBooked) {
    res.status(400).json({ error: "Este horario ya está reservado" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.userId, req.user!.userId)));

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const hasPack = client.remainingSessions > 0 && client.totalSessions > 0;
  const sessionPrice = hasPack
    ? Number(client.packPrice) / client.totalSessions
    : (manualPrice ?? 0);

  const sessionDate = new Date(`${slot.date}T${slot.startTime}:00`);

  const [session] = await db.transaction(async (tx) => {
    const [sess] = await tx
      .insert(sessionsTable)
      .values({
        userId: req.user!.userId,
        clientId,
        date: sessionDate,
        status: "pending",
        price: String(sessionPrice),
        paid: false,
        source: "booking",
      })
      .returning();

    if (hasPack) {
      await tx
        .update(clientsTable)
        .set({ remainingSessions: client.remainingSessions - 1 })
        .where(eq(clientsTable.id, clientId));
    }

    await tx
      .update(availabilityTable)
      .set({ isBooked: true, sessionId: sess.id, clientName: client.name })
      .where(eq(availabilityTable.id, id));

    return [sess];
  });

  res.status(201).json({ ...session, price: Number(session.price), clientName: client.name });
});

export default router;
