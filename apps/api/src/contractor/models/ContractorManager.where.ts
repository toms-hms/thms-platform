import { arrayOverlaps, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { TradeCategory } from '@thms/shared';
import { contractors } from './Contractor';
import { contractorZipCodes } from './ContractorZipCode';

// Predicate helpers — return `SQL | undefined` for composition inside `and(...)`.
// Value-bearing predicates are plural and take arrays. Boolean predicates
// (`filterIsGlobal`) and `search` are exempt. Each helper is a no-op when
// its argument is undefined; an empty array means "match nothing".

export function filterIds(ids?: string[]): SQL | undefined {
  if (ids === undefined) return undefined;
  if (ids.length === 0) return sql`1 = 0`;
  return inArray(contractors.id, ids);
}

export function filterZipCodes(zipCodes?: string[]): SQL | undefined {
  if (zipCodes === undefined) return undefined;
  if (zipCodes.length === 0) return sql`1 = 0`;
  const subq = db
    .select({ contractorId: contractorZipCodes.contractorId })
    .from(contractorZipCodes)
    .where(inArray(contractorZipCodes.zipCode, zipCodes));
  return inArray(contractors.id, subq);
}

export function filterTradeCategories(tradeCategories?: TradeCategory[]): SQL | undefined {
  if (tradeCategories === undefined) return undefined;
  if (tradeCategories.length === 0) return sql`1 = 0`;
  return arrayOverlaps(contractors.categories, tradeCategories);
}

export function filterEmails(emails?: string[]): SQL | undefined {
  if (emails === undefined) return undefined;
  if (emails.length === 0) return sql`1 = 0`;
  return or(...emails.map((e) => ilike(contractors.email, e)));
}

export function filterIsGlobal(isGlobal?: boolean): SQL | undefined {
  return isGlobal === undefined ? undefined : eq(contractors.isGlobal, isGlobal);
}

export function search(query?: string): SQL | undefined {
  if (!query) return undefined;
  const q = `%${query}%`;
  return or(
    ilike(contractors.name, q),
    ilike(contractors.companyName, q),
    ilike(contractors.email, q),
  );
}
