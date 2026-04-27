import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { homeRoleEnum } from '../../db/enums';
import { users } from '../../auth/models/User';
import { homes } from './Home';

export const userHomes = pgTable('UserHome', {
  userId:    text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  homeId:    text('homeId').notNull().references(() => homes.id, { onDelete: 'cascade' }),
  role:      homeRoleEnum('role').notNull().default('OWNER'),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.homeId] })]);

export type UserHome    = typeof userHomes.$inferSelect;
export type NewUserHome = typeof userHomes.$inferInsert;
