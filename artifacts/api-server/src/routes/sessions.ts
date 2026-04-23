import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, sessionsTable, clientsTable } from "@workspace/db";
import {
  CreateSessionBody,
  UpdateSessionBody,
  GetSessionParams,
  UpdateSessionParams,
  DeleteSessionParams,
  ListSessionsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/sessions", async (req, res): Promise<void> => {
  const queryParsed = ListSessionsQueryParams.safeParse(req.query);
  const clientId = queryParsed.success ? queryParsed.data.clientId : null;

  let conditions = [eq(sessionsTable.userId, req.user!.userId)];
  if (clientId != null) {
    conditions.push(eq(sessionsTable.clientId, clientId));
  }

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
    .where(and(...conditions))
    .orderBy(sessionsTable.date);

  res.json(rows.map(r => ({ ...r, price: Number(r.price) })));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { clientId, date, status, price, paid, notes } = parsed.data;

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.userId, req.user!.userId)));

  if (!client) {
    res.status(400).json({ error: "Client not found or does not belong to you" });
    return;
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId: req.user!.userId,
      clientId,
      date: new Date(date),
      status: status ?? "pending",
      price: String(price),
      paid: paid ?? false,
      notes: notes ?? null,
    })
    .returning();

  const [row] = await db
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
    .where(eq(sessionsTable.id, session.id));

  res.status(201).json({ ...row, price: Number(row.price) });
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSessionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
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
    .where(and(eq(sessionsTable.id, params.data.id), eq(sessionsTable.userId, req.user!.userId)));

  if (!row) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({ ...row, price: Number(row.price) });
});

router.patch("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateSessionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.clientId !== undefined) updateData.clientId = parsed.data.clientId;
  if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date);
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);
  if (parsed.data.paid !== undefined) updateData.paid = parsed.data.paid;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const [session] = await db
    .update(sessionsTable)
    .set(updateData)
    .where(and(eq(sessionsTable.id, params.data.id), eq(sessionsTable.userId, req.user!.userId)))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [row] = await db
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
    .where(eq(sessionsTable.id, session.id));

  res.json({ ...row, price: Number(row.price) });
});

router.delete("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteSessionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .delete(sessionsTable)
    .where(and(eq(sessionsTable.id, params.data.id), eq(sessionsTable.userId, req.user!.userId)))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
