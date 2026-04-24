import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, bookingRequestsTable, clientsTable, sessionsTable, availabilityTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/booking-requests/count", async (req, res): Promise<void> => {
  const requests = await db
    .select({ id: bookingRequestsTable.id })
    .from(bookingRequestsTable)
    .where(and(eq(bookingRequestsTable.userId, req.user!.userId), eq(bookingRequestsTable.status, "pending")));
  res.json({ count: requests.length });
});

router.get("/booking-requests", async (req, res): Promise<void> => {
  const requests = await db
    .select()
    .from(bookingRequestsTable)
    .where(and(eq(bookingRequestsTable.userId, req.user!.userId), eq(bookingRequestsTable.status, "pending")))
    .orderBy(bookingRequestsTable.createdAt);
  res.json(requests);
});

router.post("/booking-requests/:id/accept", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [request] = await db
    .select()
    .from(bookingRequestsTable)
    .where(and(eq(bookingRequestsTable.id, id), eq(bookingRequestsTable.userId, req.user!.userId)));
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }

  await db.transaction(async (tx) => {
    let [client] = await tx
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.userId, request.userId), eq(clientsTable.name, request.name)));

    if (!client) {
      [client] = await tx
        .insert(clientsTable)
        .values({
          userId: request.userId,
          name: request.name,
          phone: request.phone ?? null,
          packPrice: "0",
          totalSessions: 0,
          remainingSessions: 0,
        })
        .returning();
    }

    const isGroup = request.people > 2;
    const [sess] = await tx
      .insert(sessionsTable)
      .values({
        userId: request.userId,
        clientId: client.id,
        date: request.date,
        status: "pending",
        price: "0",
        paid: false,
        source: "booking",
        people: request.people,
        isGroup,
      })
      .returning();

    if (request.slotId) {
      await tx
        .update(availabilityTable)
        .set({ sessionId: sess.id, clientName: request.name })
        .where(eq(availabilityTable.id, request.slotId));
    }

    await tx
      .update(bookingRequestsTable)
      .set({ status: "accepted" })
      .where(eq(bookingRequestsTable.id, id));
  });

  res.json({ ok: true });
});

router.delete("/booking-requests/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [request] = await db
    .select()
    .from(bookingRequestsTable)
    .where(and(eq(bookingRequestsTable.id, id), eq(bookingRequestsTable.userId, req.user!.userId)));
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }

  await db.transaction(async (tx) => {
    if (request.slotId && request.slotStartTime) {
      const [slot] = await tx
        .select()
        .from(availabilityTable)
        .where(eq(availabilityTable.id, request.slotId));
      if (slot) {
        const booked: string[] = JSON.parse(slot.bookedSubSlots || "[]");
        const updated = booked.filter(t => t !== request.slotStartTime);
        await tx
          .update(availabilityTable)
          .set({ bookedSubSlots: JSON.stringify(updated), clientName: updated.length > 0 ? slot.clientName : null })
          .where(eq(availabilityTable.id, request.slotId));
      }
    }
    await tx.delete(bookingRequestsTable).where(eq(bookingRequestsTable.id, id));
  });

  res.sendStatus(204);
});

export default router;
