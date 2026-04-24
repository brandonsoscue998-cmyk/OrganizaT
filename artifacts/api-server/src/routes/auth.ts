import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, name, role } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "user";
  let username = baseSlug;
  let counter = 1;
  while (true) {
    const [taken] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (!taken) break;
    username = `${baseSlug}-${counter++}`;
  }

  const { spaceName, pricePerSlot } = parsed.data as { spaceName?: string; pricePerSlot?: string };
  const [user] = await db.insert(usersTable).values({ email, name, passwordHash, username, role: role ?? "trainer", spaceName: spaceName ?? null, pricePerSlot: pricePerSlot ?? "0" }).returning();

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      spaceName: user.spaceName,
      pricePerSlot: user.pricePerSlot,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      spaceName: user.spaceName,
      pricePerSlot: user.pricePerSlot,
      createdAt: user.createdAt,
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    role: user.role,
    spaceName: user.spaceName,
    pricePerSlot: user.pricePerSlot,
    groupExtraPrice: user.groupExtraPrice,
    referralsEnabled: user.referralsEnabled,
    autoAcceptBookings: user.autoAcceptBookings,
    createdAt: user.createdAt,
  });
});

router.patch("/auth/me/auto-accept", requireAuth, async (req, res): Promise<void> => {
  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") { res.status(400).json({ error: "enabled must be boolean" }); return; }
  await db.update(usersTable).set({ autoAcceptBookings: enabled }).where(eq(usersTable.id, req.user!.userId));
  res.json({ autoAcceptBookings: enabled });
});

router.patch("/auth/me/referrals", requireAuth, async (req, res): Promise<void> => {
  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") { res.status(400).json({ error: "enabled must be boolean" }); return; }
  await db.update(usersTable).set({ referralsEnabled: enabled }).where(eq(usersTable.id, req.user!.userId));
  res.json({ referralsEnabled: enabled });
});

router.patch("/auth/me/space", requireAuth, async (req, res): Promise<void> => {
  const { spaceName, pricePerSlot, groupExtraPrice } = req.body ?? {};
  const updateData: { spaceName?: string | null; pricePerSlot?: string; groupExtraPrice?: string } = {};
  if (typeof spaceName === "string") updateData.spaceName = spaceName.trim() || null;
  if (typeof pricePerSlot === "string" || typeof pricePerSlot === "number") updateData.pricePerSlot = String(pricePerSlot);
  if (typeof groupExtraPrice === "string" || typeof groupExtraPrice === "number") updateData.groupExtraPrice = String(groupExtraPrice);
  if (Object.keys(updateData).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, req.user!.userId)).returning();
  res.json({ spaceName: user.spaceName, pricePerSlot: user.pricePerSlot, groupExtraPrice: user.groupExtraPrice });
});

export default router;
