import { arrayContains, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { TradeCategory } from '@thms/shared';
import { contractors } from './Contractor';
import { contractorZipCodes } from './ContractorZipCode';

// Predicate helpers — return `SQL | undefined` for composition inside `and(...)`.
// `filter<Field>` narrows the result set by an exact attribute. `search` is a
// fuzzy multi-column ILIKE OR — not a filter. Each helper is a no-op when its
// argument is undefined so the manager method passes request query params
// unconditionally without null checks.

export function filterIds(ids?: string[]): SQL | undefined {
  if (ids === undefined) return undefined;
  if (ids.length === 0) return sql`1 = 0`;
  return inArray(contractors.id, ids);
}

export function filterZipCode(zipCode?: string): SQL | undefined {
  if (!zipCode) return undefined;
  const subq = db
    .select({ contractorId: contractorZipCodes.contractorId })
    .from(contractorZipCodes)
    .where(eq(contractorZipCodes.zipCode, zipCode));
  return inArray(contractors.id, subq);
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

export function filterCategory(category?: TradeCategory): SQL | undefined {
  return category ? arrayContains(contractors.categories, [category]) : undefined;
}

export function filterIsGlobal(isGlobal?: boolean): SQL | undefined {
  return isGlobal === undefined ? undefined : eq(contractors.isGlobal, isGlobal);
}

export function filterEmail(email?: string): SQL | undefined {
  return email ? ilike(contractors.email, email) : undefined;
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
