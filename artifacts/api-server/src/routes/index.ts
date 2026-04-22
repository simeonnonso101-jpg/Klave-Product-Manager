import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import groupsRouter from "./groups";
import messagesRouter from "./messages";
import paymentsRouter from "./payments";
import walletRouter from "./wallet";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";
import realtimeRouter from "./realtime";
import directChatsRouter from "./directChats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(groupsRouter);
router.use(messagesRouter);
router.use(paymentsRouter);
router.use(walletRouter);
router.use(aiRouter);
router.use(dashboardRouter);
router.use(realtimeRouter);
router.use(directChatsRouter);

export default router;
