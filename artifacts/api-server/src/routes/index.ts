import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";
import availabilityRouter from "./availability";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clientsRouter);
router.use(sessionsRouter);
router.use(dashboardRouter);
router.use(availabilityRouter);

export default router;
