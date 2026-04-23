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
  res.json(clients);
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({ ...parsed.data, userId: req.user!.userId })
    .returning();

  res.status(201).json(client);
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

  res.json(client);
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

  const [client] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.userId, req.user!.userId)))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.json(client);
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
