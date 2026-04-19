import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import groupsRouter from "./groups";
import messagesRouter from "./messages";
import paymentsRouter from "./payments";
import walletRouter from "./wallet";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(groupsRouter);
router.use(messagesRouter);
router.use(paymentsRouter);
router.use(walletRouter);
router.use(aiRouter);
router.use(dashboardRouter);

export default router;
