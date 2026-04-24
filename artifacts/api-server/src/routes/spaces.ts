import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, availabilityTable, sessionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.post("/spaces/book", async (req, res): Promise<void> => {
  const { ownerUsername, availabilityId, subStart } = req.body ?? {};
  if (!ownerUsername || typeof ownerUsername !== "string") { res.status(400).json({ error: "ownerUsername requerido" }); return; }
  if (!availabilityId || typeof availabilityId !== "number") { res.status(400).json({ error: "availabilityId requerido" }); return; }
  if (!subStart || typeof subStart !== "string" || !/^\d{2}:\d{2}$/.test(subStart)) { res.status(400).json({ error: "subStart requerido (HH:MM)" }); return; }

  const [owner] = await db
    .select({ id: usersTable.id, name: usersTable.name, spaceName: usersTable.spaceName, pricePerSlot: usersTable.pricePerSlot, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.username, ownerUsername));

  if (!owner || owner.role !== "owner") { res.status(404).json({ error: "Espacio no encontrado" }); return; }

  const [slot] = await db
    .select()
    .from(availabilityTable)
    .where(and(eq(availabilityTable.id, availabilityId), eq(availabilityTable.userId, owner.id)));

  if (!slot) { res.status(404).json({ error: "Horario no encontrado" }); return; }

  const bookedTimes: string[] = JSON.parse(slot.bookedSubSlots || "[]");
  if (bookedTimes.includes(subStart)) { res.status(409).json({ error: "Este horario ya está reservado" }); return; }

  const sessionDate = new Date(`${slot.date}T${subStart}:00`);
  const price = owner.pricePerSlot ?? "0";

  const [session] = await db.transaction(async (tx) => {
    const updatedBookedTimes = [...bookedTimes, subStart];
    await tx.update(availabilityTable)
      .set({ bookedSubSlots: JSON.stringify(updatedBookedTimes) })
      .where(eq(availabilityTable.id, slot.id));

    return tx.insert(sessionsTable).values({
      userId: req.user!.userId,
      clientId: null,
      ownerId: owner.id,
      type: "space",
      date: sessionDate,
      status: "pending",
      price,
      paid: false,
      source: "space",
      notes: owner.spaceName ?? owner.name,
      people: 1,
      isGroup: false,
    }).returning();
  });

  res.status(201).json(session);
});

export default router;
