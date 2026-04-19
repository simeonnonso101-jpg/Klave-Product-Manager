import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const replicationJobsTable = pgTable("replication_jobs", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull(),
  sourceGroupId: integer("source_group_id").notNull(),
  messageId: integer("message_id").notNull(),
  targetGroupIds: text("target_group_ids").notNull().default("[]"),
  status: text("status").notNull().default("pending"),
  replicatedCount: integer("replicated_count").notNull().default(0),
  totalTargets: integer("total_targets").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReplicationJobSchema = createInsertSchema(replicationJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReplicationJob = z.infer<typeof insertReplicationJobSchema>;
export type ReplicationJob = typeof replicationJobsTable.$inferSelect;
