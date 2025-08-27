import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  displayName: text('display_name').notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  firstSubmissionAt: timestamp('first_submission_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const stats = pgTable('stats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  easy: integer('easy').notNull(),
  medium: integer('medium').notNull(),
  hard: integer('hard').notNull(),
});

export const refreshBans = pgTable('refresh_bans', {
  ip: text('ip').notNull(),
  username: text('username').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const dailyProgress = pgTable('daily_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: text('date').notNull(), // Format: 'YYYY-MM-DD' in LAX timezone
  easy: integer('easy').default(0).notNull(),
  medium: integer('medium').default(0).notNull(),
  hard: integer('hard').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  stats: many(stats),
  dailyProgress: many(dailyProgress),
}));

export const statsRelations = relations(stats, ({ one }) => ({
  user: one(users, {
    fields: [stats.userId],
    references: [users.id],
  }),
}));

export const dailyProgressRelations = relations(dailyProgress, ({ one }) => ({
  user: one(users, {
    fields: [dailyProgress.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Stat = typeof stats.$inferSelect;
export type NewStat = typeof stats.$inferInsert;
export type RefreshBan = typeof refreshBans.$inferSelect;
export type NewRefreshBan = typeof refreshBans.$inferInsert;
export type DailyProgress = typeof dailyProgress.$inferSelect;
export type NewDailyProgress = typeof dailyProgress.$inferInsert;
