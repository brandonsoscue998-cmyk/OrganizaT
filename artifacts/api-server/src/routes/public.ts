import { Router, type IRouter } from "express";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { db, usersTable, availabilityTable, clientsTable, sessionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/public/trainers", async (_req, res): Promise<void> => {
  const trainers = await db
    .select({ id: usersTable.id, name: usersTable.name, username: usersTable.username, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.role, "trainer"))
    .orderBy(usersTable.name);
  res.json(trainers);
});


async function findTrainer(username: string) {
  const [trainer] = await db
    .select({ id: usersTable.id, name: usersTable.name, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.username, username));
  return trainer ?? null;
}

router.get("/public/u/:username", async (req, res): Promise<void> => {
  const { username } = req.params;
  const trainer = await findTrainer(username);
  if (!trainer) {
    res.status(404).json({ error: "Trainer not found" });
    return;
  }

  const { from, to } = req.query;
  const conditions: SQL[] = [
    eq(availabilityTable.userId, trainer.id),
    eq(availabilityTable.isBooked, false),
  ];
  if (from && typeof from === "string") conditions.push(gte(availabilityTable.date, from));
  if (to && typeof to === "string") conditions.push(lte(availabilityTable.date, to));

  const slots = await db
    .select()
    .from(availabilityTable)
    .where(and(...conditions))
    .orderBy(availabilityTable.date, availabilityTable.startTime);

  res.json({ trainer: { name: trainer.name, username: trainer.username }, slots });
});

router.post("/public/u/:username/book/:slotId", async (req, res): Promise<void> => {
  const { username, slotId } = req.params;
  const id = parseInt(slotId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid slot id" });
    return;
  }

  const rawName = req.body?.name;
  const rawPhone = req.body?.phone;
  const rawSlotStart = req.body?.slotStartTime;
  if (!rawName || typeof rawName !== "string" || rawName.trim().length === 0) {
    res.status(400).json({ error: "El nombre es obligatorio" });
    return;
  }
  const name: string = rawName.trim();
  const phone: string | undefined = typeof rawPhone === "string" && rawPhone.trim() ? rawPhone.trim() : undefined;
  const slotStartOverride: string | undefined = typeof rawSlotStart === "string" && /^\d{2}:\d{2}$/.test(rawSlotStart) ? rawSlotStart : undefined;

  const trainer = await findTrainer(username);
  if (!trainer) {
    res.status(404).json({ error: "Trainer not found" });
    return;
  }

  const [slot] = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.id, id), eq(availabilityTable.userId, trainer.id)));

  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }
  if (slot.isBooked) {
    res.status(409).json({ error: "Este horario ya está reservado" });
    return;
  }

  const session = await db.transaction(async (tx) => {
    let [client] = await tx
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.userId, trainer.id), eq(clientsTable.name, name)));

    if (!client) {
      [client] = await tx
        .insert(clientsTable)
        .values({
          userId: trainer.id,
          name,
          phone: phone ?? null,
          packPrice: "0",
          totalSessions: 0,
          remainingSessions: 0,
          paid: false,
        })
        .returning();
    }

    const sessionDate = new Date(`${slot.date}T${slotStartOverride ?? slot.startTime}:00`);
    const [sess] = await tx
      .insert(sessionsTable)
      .values({
        userId: trainer.id,
        clientId: client.id,
        date: sessionDate,
        status: "pending",
        price: "0",
        paid: false,
        source: "booking",
      })
      .returning();

    await tx
      .update(availabilityTable)
      .set({ isBooked: true, sessionId: sess.id, clientName: name })
      .where(eq(availabilityTable.id, id));

    return sess;
  });

  res.status(201).json(session);
});

export default router;
