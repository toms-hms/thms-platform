import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { quotes, type Quote, type NewQuote } from './Quote';
import { contractors } from '../../contractor/models/Contractor';
import { NotFoundError } from '../../utils/errors';

export const QuoteManager = {
  async listForJob(jobId: string) {
    return db
      .select({ quote: quotes, contractor: contractors })
      .from(quotes)
      .innerJoin(contractors, eq(quotes.contractorId, contractors.id))
      .where(eq(quotes.jobId, jobId))
      .orderBy(quotes.createdAt);
  },

  async findById(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    return quote;
  },

  async create(data: NewQuote): Promise<Quote> {
    const [quote] = await db.insert(quotes).values(data).returning();
    return quote;
  },

  async update(id: string, data: Partial<NewQuote>): Promise<Quote> {
    const [quote] = await db
      .update(quotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    if (!quote) throw new NotFoundError('Quote');
    return quote;
  },

  async delete(id: string): Promise<void> {
    await db.delete(quotes).where(eq(quotes.id, id));
  },
};
