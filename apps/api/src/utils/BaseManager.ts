import { and, eq, type SQL } from 'drizzle-orm';
import { type PgTable } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';
import { db } from '@/db';
import { NotFoundError } from './errors';

/**
 * Base class for all managers. Provides a generic get() method that builds
 * a WHERE clause from a partial model object and executes a single-record lookup.
 * Subclasses must define the Drizzle table via the abstract `table` property.
 */
export abstract class BaseManager<TTable extends PgTable> {
  abstract readonly table: TTable;

  /** Returns a single record matching all provided fields, or throws NotFoundError. */
  async get(where: Partial<InferSelectModel<TTable>>): Promise<InferSelectModel<TTable>> {
    const conditions = (Object.entries(where) as [string, unknown][])
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => eq((this.table as any)[k], v));

    if (!conditions.length) throw new Error('get() requires at least one condition');

    const [result] = await db
      .select()
      .from(this.table)
      .where(and(...(conditions as SQL[])))
      .limit(1);

    if (!result) throw new NotFoundError('Record');
    return result as InferSelectModel<TTable>;
  }
}
