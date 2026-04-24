import { Router, type IRouter } from "express";
import { eq, and, gte, lte, inArray, SQL } from "drizzle-orm";
import { db, usersTable, availabilityTable, clientsTable, sessionsTable, bookingRequestsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/public/trainers", async (_req, res): Promise<void> => {
  const trainers = await db
    .select({ id: usersTable.id, name: usersTable.name, username: usersTable.username, email: usersTable.email, role: usersTable.role, spaceName: usersTable.spaceName, pricePerSlot: usersTable.pricePerSlot })
    .from(usersTable)
    .where(inArray(usersTable.role, ["trainer", "owner"]))
    .orderBy(usersTable.name);
  res.json(trainers);
});


async function findTrainer(username: string) {
  const [trainer] = await db
    .select({ id: usersTable.id, name: usersTable.name, username: usersTable.username, role: usersTable.role, spaceName: usersTable.spaceName, pricePerSlot: usersTable.pricePerSlot, groupExtraPrice: usersTable.groupExtraPrice, referralsEnabled: usersTable.referralsEnabled, autoAcceptBookings: usersTable.autoAcceptBookings })
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

  res.json({ trainer: { name: trainer.name, username: trainer.username, role: trainer.role, spaceName: trainer.spaceName, pricePerSlot: trainer.pricePerSlot, groupExtraPrice: trainer.groupExtraPrice, referralsEnabled: trainer.referralsEnabled }, slots });
});

router.get("/public/u/:username/my-info", async (req, res): Promise<void> => {
  const trainer = await findTrainer(req.params.username);
  if (!trainer) { res.status(404).json({ error: "Trainer not found" }); return; }
  const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [client] = await db
    .select({ remainingSessions: clientsTable.remainingSessions, totalSessions: clientsTable.totalSessions, packPrice: clientsTable.packPrice })
    .from(clientsTable)
    .where(and(eq(clientsTable.userId, trainer.id), eq(clientsTable.name, name)));
  res.json(client ?? null);
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
  const rawRef = typeof req.body?.ref === "string" && req.body.ref.trim() ? req.body.ref.trim() : null;
  const people = typeof req.body?.people === "number" && req.body.people >= 1 ? Math.floor(req.body.people) : 1;
  const isGroup = people > 2;
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
  const bookedTimes: string[] = JSON.parse(slot.bookedSubSlots || "[]");
  const subSlotTime = typeof req.body?.slotStartTime === "string" && /^\d{2}:\d{2}$/.test(req.body.slotStartTime) ? req.body.slotStartTime : slot.startTime;
  if (bookedTimes.includes(subSlotTime)) {
    res.status(409).json({ error: "Este horario ya está reservado" });
    return;
  }

  const sessionDate = new Date(`${slot.date}T${slotStartOverride ?? slot.startTime}:00`);

  const result = await db.transaction(async (tx) => {
    let [client] = await tx
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.userId, trainer.id), eq(clientsTable.name, name)));

    const wasNew = !client;
    if (!client) {
      if (trainer.autoAcceptBookings && name) {
        [client] = await tx
          .insert(clientsTable)
          .values({ userId: trainer.id, name, phone: phone ?? null, packPrice: "0", totalSessions: 0, remainingSessions: 0 })
          .returning();
      } else {
        const updatedBookedTimes = [...bookedTimes, subSlotTime];
        await tx
          .update(availabilityTable)
          .set({ bookedSubSlots: JSON.stringify(updatedBookedTimes), clientName: name })
          .where(eq(availabilityTable.id, id));
        await tx.insert(bookingRequestsTable).values({
          userId: trainer.id,
          name,
          phone: phone ?? null,
          date: sessionDate,
          slotId: id,
          slotStartTime: subSlotTime,
          people,
        });
        return null;
      }
    }

    if (client.remainingSessions > 0) {
      await tx
        .update(clientsTable)
        .set({ remainingSessions: client.remainingSessions - 1 })
        .where(eq(clientsTable.id, client.id));
    }

    const isOwner = trainer.role === "owner";
    const basePrice = isOwner && trainer.pricePerSlot ? Number(trainer.pricePerSlot) : 0;
    const extraPrice = isGroup && trainer.groupExtraPrice ? Number(trainer.groupExtraPrice) : 0;
    const sessionPrice = String(basePrice + extraPrice);
    const refSource = trainer.referralsEnabled && rawRef ? "referral" : null;
    const source = refSource ?? (isOwner ? "space" : "booking");
    const [sess] = await tx
      .insert(sessionsTable)
      .values({
        userId: trainer.id,
        clientId: client.id,
        date: sessionDate,
        status: "pending",
        price: sessionPrice,
        paid: false,
        source,
        people,
        isGroup,
      })
      .returning();

    const updatedBookedTimes = [...bookedTimes, subSlotTime];
    await tx
      .update(availabilityTable)
      .set({ bookedSubSlots: JSON.stringify(updatedBookedTimes), sessionId: sess.id, clientName: name })
      .where(eq(availabilityTable.id, id));

    return { ...sess, autoAccepted: wasNew };
  });

  if (!result) {
    res.status(202).json({ pending: true, message: "Solicitud de reserva enviada. El profesional confirmará tu cita pronto." });
    return;
  }

  res.status(201).json(result);
});

export default router;
