import { pgTable, text, serial, timestamp, numeric, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // "class" = course/cohort group (default), "personal" = direct-message thread.
  type: text("type").notNull().default("class"),
  creatorId: integer("creator_id").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }),
  subscriptionModel: text("subscription_model"),
  memberCount: integer("member_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  coverImageUrl: text("cover_image_url"),
  subject: text("subject"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  // Partial unique index: enforces one DM thread per canonical "dm:<a>:<b>"
  // name. Prevents a race where two simultaneous taps create duplicate threads.
  dmCanonicalNameIdx: uniqueIndex("groups_dm_canonical_name_idx")
    .on(t.name)
    .where(sql`type = 'personal'`),
}));

export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true, updatedAt: true, memberCount: true });
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groupsTable.$inferSelect;
