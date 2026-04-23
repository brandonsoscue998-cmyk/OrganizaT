import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, clientsTable } from "@workspace/db";
import {
  CreateClientBody,
  UpdateClientBody,
  GetClientParams,
  UpdateClientParams,
  DeleteClientParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/clients", async (req, res): Promise<void> => {
  const clients = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.userId, req.user!.userId))
    .orderBy(clientsTable.name);
  res.json(clients.map(c => ({ ...c, packPrice: Number(c.packPrice) })));
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { totalSessions = 0, packPrice = 0, ...rest } = parsed.data;

  if (totalSessions < 0) {
    res.status(400).json({ error: "totalSessions must be >= 0" });
    return;
  }
  if (packPrice < 0) {
    res.status(400).json({ error: "packPrice must be >= 0" });
    return;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({
      ...rest,
      userId: req.user!.userId,
      totalSessions,
      remainingSessions: totalSessions,
      packPrice: String(packPrice),
    })
    .returning();

  res.status(201).json({ ...client, packPrice: Number(client.packPrice) });
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetClientParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.userId, req.user!.userId)));

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json({ ...client, packPrice: Number(client.packPrice) });
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateClientParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.totalSessions !== undefined && parsed.data.totalSessions < 0) {
    res.status(400).json({ error: "totalSessions must be >= 0" });
    return;
  }
  if (parsed.data.packPrice !== undefined && parsed.data.packPrice < 0) {
    res.status(400).json({ error: "packPrice must be >= 0" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.packPrice !== undefined) updateData.packPrice = String(parsed.data.packPrice);

  if (parsed.data.totalSessions !== undefined) {
    const [current] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.userId, req.user!.userId)));

    if (!current) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const oldTotal = current.totalSessions;
    const oldRemaining = current.remainingSessions;
    const newTotal = parsed.data.totalSessions;

    let newRemaining: number;
    if (newTotal > oldTotal) {
      newRemaining = oldRemaining + (newTotal - oldTotal);
    } else {
      newRemaining = Math.min(oldRemaining, newTotal);
    }

    updateData.totalSessions = newTotal;
    updateData.remainingSessions = Math.max(0, newRemaining);
  }

  if (parsed.data.remainingSessions !== undefined && parsed.data.totalSessions === undefined) {
    if (parsed.data.remainingSessions < 0) {
      res.status(400).json({ error: "remainingSessions must be >= 0" });
      return;
    }
    updateData.remainingSessions = parsed.data.remainingSessions;
  }

  const [client] = await db
    .update(clientsTable)
    .set(updateData)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.userId, req.user!.userId)))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json({ ...client, packPrice: Number(client.packPrice) });
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteClientParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db
    .delete(clientsTable)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.userId, req.user!.userId)))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
