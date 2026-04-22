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
import discoverRouter from "./discover";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
// IMPORTANT: discoverRouter must be registered before groupsRouter so that
// "/groups/discover" matches the literal route and isn't swallowed by
// "/groups/:id" (which would parse "discover" as a numeric id and 400).
router.use(discoverRouter);
router.use(groupsRouter);
router.use(messagesRouter);
router.use(paymentsRouter);
router.use(walletRouter);
router.use(aiRouter);
router.use(dashboardRouter);
router.use(realtimeRouter);
router.use(directChatsRouter);
router.use(storageRouter);

export default router;
