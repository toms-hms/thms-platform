import { TradeCategory } from '@/graphql/types.generated';

/** Display names for every trade category. */
export const TRADE_CATEGORY_LABELS: Record<TradeCategory, string> = {
  [TradeCategory.CARPENTRY]: 'Carpentry',
  [TradeCategory.DOORS_AND_WINDOWS]: 'Doors & Windows',
  [TradeCategory.ELECTRICAL]: 'Electrical',
  [TradeCategory.FLOORING]: 'Flooring',
  [TradeCategory.GENERAL_CONTRACTING]: 'General Contracting',
  [TradeCategory.HVAC]: 'HVAC',
  [TradeCategory.LANDSCAPING]: 'Landscaping',
  [TradeCategory.PAINTING]: 'Painting',
  [TradeCategory.PEST_CONTROL]: 'Pest Control',
  [TradeCategory.PLUMBING]: 'Plumbing',
  [TradeCategory.POOL_AND_SPA]: 'Pool & Spa',
  [TradeCategory.ROOFING]: 'Roofing',
};

/** Returns the display name for a category the API sent as a string, falling back to the raw value. */
export function tradeCategoryLabel(value: string): string {
  return TRADE_CATEGORY_LABELS[value as TradeCategory] ?? value;
}

/** Every trade category as `{ value, label }` options, in the enum's declared order. */
export const TRADE_CATEGORY_OPTIONS = Object.values(TradeCategory).map((value) => ({
  label: TRADE_CATEGORY_LABELS[value],
  value,
}));
