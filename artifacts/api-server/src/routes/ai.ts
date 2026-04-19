import { Router, type IRouter } from "express";
import { db, replicationJobsTable, messagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ReplicateLectureBody,
  ListReplicationJobsQueryParams,
  ListReplicationJobsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/ai/replicate", async (req, res): Promise<void> => {
  const parsed = ReplicateLectureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const targetIds = parsed.data.targetGroupIds;
  const [job] = await db.insert(replicationJobsTable).values({
    creatorId: parsed.data.creatorId,
    sourceGroupId: parsed.data.sourceGroupId,
    messageId: parsed.data.messageId,
    targetGroupIds: JSON.stringify(targetIds),
    status: "processing",
    replicatedCount: 0,
    totalTargets: targetIds.length,
  }).returning();

  // Replicate message to each target group
  const [sourceMsg] = await db.select().from(messagesTable).where(eq(messagesTable.id, parsed.data.messageId)).limit(1);
  if (sourceMsg) {
    for (const targetGroupId of targetIds) {
      await db.insert(messagesTable).values({
        groupId: targetGroupId,
        senderId: parsed.data.creatorId,
        content: sourceMsg.content,
        type: "lecture",
        isReplicated: true,
        replicationJobId: job.id,
      });
    }
  }

  // Mark job complete
  const [completed] = await db.update(replicationJobsTable)
    .set({ status: "completed", replicatedCount: targetIds.length })
    .where(eq(replicationJobsTable.id, job.id))
    .returning();

  res.status(201).json({
    ...completed,
    targetGroupIds: JSON.parse(completed.targetGroupIds ?? "[]"),
  });
});

router.get("/ai/jobs", async (req, res): Promise<void> => {
  const query = ListReplicationJobsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const jobs = await db.select().from(replicationJobsTable)
    .where(eq(replicationJobsTable.creatorId, query.data.creatorId))
    .orderBy(replicationJobsTable.createdAt);
  const mapped = jobs.map((j) => ({
    ...j,
    targetGroupIds: JSON.parse(j.targetGroupIds ?? "[]"),
  }));
  res.json(ListReplicationJobsResponse.parse(mapped));
});

export default router;
