import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";
import availabilityRouter from "./availability";
import publicRouter from "./public";
import spacesRouter from "./spaces";
import bookingRequestsRouter from "./bookingRequests";
import usersAdminRouter from "./usersAdmin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(publicRouter);
router.use(clientsRouter);
router.use(sessionsRouter);
router.use(dashboardRouter);
router.use(availabilityRouter);
router.use(spacesRouter);
router.use(bookingRequestsRouter);
router.use(usersAdminRouter);

export default router;
