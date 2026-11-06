/**
 * zod building blocks for form fields, so every form validates and words its errors the same way.
 * A form's schema composes these: `z.object({ name: requiredText('Enter a name'), notes: optionalText })`.
 */
import { z } from 'zod';

/** A text field that must not be blank. Trimmed. */
export function requiredText(message: string) {
  return z.string().trim().min(1, message);
}

/** A text field that may be blank. Trimmed; a blank value becomes `undefined`, so the API leaves the field unset. */
export const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);

/**
 * A text field in an *edit* form that may be blanked. Trimmed; a blank value becomes `null`, which
 * tells the API to clear the field (`undefined` would leave the old value in place).
 */
export const clearableText = z
  .string()
  .trim()
  .transform((value) => value || null);

/** An email in an edit form that may be blanked: `null` clears it. */
export const clearableEmail = z
  .union([z.literal(''), z.email('Enter a valid email address')])
  .transform((value) => value || null);

/** A US state as its 2-letter code, uppercased. */
export const stateCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'Use the 2-letter state code')
  .transform((value) => value.toUpperCase());

/** A 5-digit US ZIP code. */
export const zipCode = z.string().trim().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code');

/** An email address that may be blank. */
export const optionalEmail = z.union([z.literal(''), z.email('Enter a valid email address')]).transform((value) => value || undefined);

/** A comma-separated list of ZIP codes, as an array. Blank entries are dropped. */
export const zipCodeList = z
  .string()
  .transform((value) => value.split(',').map((zip) => zip.trim()).filter(Boolean))
  .pipe(z.array(z.string().regex(/^\d{5}$/, 'Each ZIP code needs 5 digits')));
