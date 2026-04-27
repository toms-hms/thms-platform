import { JobIntent, TradeCategory } from '@thms/shared';

export interface CategoryTile {
  label: string;
  description: string;
  tradeCategory: TradeCategory;
  emoji: string;
}

export const CATEGORY_CONFIG: Record<JobIntent, CategoryTile[]> = {
  [JobIntent.ISSUE]: [
    { label: 'Plumbing',           description: 'Leaks, clogs, water pressure',          tradeCategory: TradeCategory.PLUMBING,            emoji: '🔧' },
    { label: 'Electrical',         description: 'Outlets, breakers, wiring',              tradeCategory: TradeCategory.ELECTRICAL,          emoji: '⚡' },
    { label: 'HVAC',               description: 'Heating, cooling, air quality',          tradeCategory: TradeCategory.HVAC,                emoji: '🌡️' },
    { label: 'Roofing & Gutters',  description: 'Leaks, storm damage, clogged gutters',  tradeCategory: TradeCategory.ROOFING,             emoji: '🏠' },
    { label: 'Pest Control',       description: 'Ants, termites, rodents',                tradeCategory: TradeCategory.PEST_CONTROL,        emoji: '🐜' },
    { label: 'Doors & Windows',    description: 'Drafts, broken seals, hardware',         tradeCategory: TradeCategory.DOORS_AND_WINDOWS,   emoji: '🚪' },
    { label: 'Flooring',           description: 'Cracks, squeaks, water damage',          tradeCategory: TradeCategory.FLOORING,            emoji: '🪵' },
    { label: 'Painting',           description: 'Peeling, staining, touch-ups',           tradeCategory: TradeCategory.PAINTING,            emoji: '🎨' },
    { label: 'Landscaping',        description: 'Drainage, tree damage, lawn issues',     tradeCategory: TradeCategory.LANDSCAPING,         emoji: '🌿' },
    { label: 'Pool & Spa',         description: 'Equipment failure, leaks, chemistry',    tradeCategory: TradeCategory.POOL_AND_SPA,        emoji: '🏊' },
    { label: 'Carpentry',          description: 'Cabinets, trim, structural wood',        tradeCategory: TradeCategory.CARPENTRY,           emoji: '🔨' },
    { label: 'General Repair',     description: 'Drywall, misc repairs, handyman',        tradeCategory: TradeCategory.GENERAL_CONTRACTING, emoji: '🛠️' },
  ],
  [JobIntent.IMPROVEMENT]: [
    { label: 'Kitchen Remodel',    description: 'Cabinets, counters, layout changes',     tradeCategory: TradeCategory.GENERAL_CONTRACTING, emoji: '🍳' },
    { label: 'Bathroom Remodel',   description: 'Tile, fixtures, layout changes',         tradeCategory: TradeCategory.GENERAL_CONTRACTING, emoji: '🚿' },
    { label: 'Painting',           description: 'Interior or exterior refresh',           tradeCategory: TradeCategory.PAINTING,            emoji: '🎨' },
    { label: 'New Flooring',       description: 'Hardwood, tile, carpet, LVP',           tradeCategory: TradeCategory.FLOORING,            emoji: '🪵' },
    { label: 'Outdoor Project',    description: 'Deck, patio, landscaping upgrade',       tradeCategory: TradeCategory.LANDSCAPING,         emoji: '🌳' },
    { label: 'Doors & Windows',    description: 'Replacements, new installs, upgrades',  tradeCategory: TradeCategory.DOORS_AND_WINDOWS,   emoji: '🚪' },
    { label: 'Addition or Remodel',description: 'Room additions, major renovations',      tradeCategory: TradeCategory.GENERAL_CONTRACTING, emoji: '🏗️' },
    { label: 'Pool & Spa',         description: 'New installation or major upgrade',      tradeCategory: TradeCategory.POOL_AND_SPA,        emoji: '🏊' },
    { label: 'Carpentry',          description: 'Built-ins, shelving, custom woodwork',   tradeCategory: TradeCategory.CARPENTRY,           emoji: '🔨' },
    { label: 'Electrical Upgrade', description: 'Panel upgrade, EV charger, smart home', tradeCategory: TradeCategory.ELECTRICAL,          emoji: '⚡' },
  ],
  [JobIntent.RECURRING_WORK]: [
    { label: 'HVAC Servicing',     description: 'Annual tune-up, filter changes',         tradeCategory: TradeCategory.HVAC,                emoji: '🌡️' },
    { label: 'Lawn Care',          description: 'Mowing, fertilizing, seasonal cleanup',  tradeCategory: TradeCategory.LANDSCAPING,         emoji: '🌿' },
    { label: 'Gutter Cleaning',    description: 'Seasonal cleaning and inspection',       tradeCategory: TradeCategory.ROOFING,             emoji: '🏠' },
    { label: 'Pest Prevention',    description: 'Regular treatments and inspections',     tradeCategory: TradeCategory.PEST_CONTROL,        emoji: '🐜' },
    { label: 'Pool Maintenance',   description: 'Weekly service, chemical balancing',     tradeCategory: TradeCategory.POOL_AND_SPA,        emoji: '🏊' },
    { label: 'Exterior Painting',  description: 'Scheduled repainting and touch-ups',     tradeCategory: TradeCategory.PAINTING,            emoji: '🎨' },
    { label: 'Plumbing Check',     description: 'Annual inspection and maintenance',      tradeCategory: TradeCategory.PLUMBING,            emoji: '🔧' },
    { label: 'Electrical Check',   description: 'Safety inspection, panel review',        tradeCategory: TradeCategory.ELECTRICAL,          emoji: '⚡' },
  ],
};
