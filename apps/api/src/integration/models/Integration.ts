import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { integrationTypeEnum, integrationProviderEnum } from '../../db/enums';
import { users } from '../../auth/models/User';

export const integrations = pgTable('Integration', {
  id:              text('id').primaryKey(),
  userId:          text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:            integrationTypeEnum('type').notNull(),
  provider:        integrationProviderEnum('provider').notNull(),
  accessTokenEnc:  text('accessTokenEnc').notNull(),
  refreshTokenEnc: text('refreshTokenEnc'),
  tokenExpiresAt:  timestamp('tokenExpiresAt', { precision: 3 }),
  email:           text('email'),
  scopes:          text('scopes').array().notNull().default([]),
  createdAt:       timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt:       timestamp('updatedAt', { precision: 3 }).notNull(),
}, (t) => [unique().on(t.userId, t.provider)]);

export type Integration    = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
