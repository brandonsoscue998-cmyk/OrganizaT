import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clientsRouter);
router.use(sessionsRouter);
router.use(dashboardRouter);

export default router;
