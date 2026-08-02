import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const lessonCompletionsTable = pgTable(
  "lesson_completions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    lessonId: integer("lesson_id").notNull(),
    groupId: integer("group_id").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqUserLesson: unique("lesson_completions_user_lesson_uniq").on(t.userId, t.lessonId),
  }),
);

export type LessonCompletion = typeof lessonCompletionsTable.$inferSelect;
