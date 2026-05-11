import { createId } from '@paralleldrive/cuid2';
import { NotFoundError } from '../utils/errors';
import { JobManager } from './models/JobManager';
import { JobContractorManager } from './models/JobContractorManager';
import type { CreateJobInput, UpdateJobInput } from '@thms/shared';
import { JobContractorStatus, JobIntent, TradeCategory } from '@thms/shared';

export interface TradeCategorySuggestion {
  category: TradeCategory;
  reason: string;
}

type CreateJobData = CreateJobInput & {
  categories?: TradeCategory[];
  aiSession?: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    summary: unknown;
    categorySuggestions?: TradeCategorySuggestion[];
    confirmedCategories?: TradeCategory[];
  } | null;
};

type UpdateJobData = Omit<UpdateJobInput, 'aiSession'> & {
  categories?: TradeCategory[];
  aiSession?: CreateJobData['aiSession'];
};

const CATEGORY_LABELS: Record<TradeCategory, string> = {
  [TradeCategory.PLUMBING]: 'plumbing',
  [TradeCategory.ELECTRICAL]: 'electrical',
  [TradeCategory.HVAC]: 'HVAC',
  [TradeCategory.ROOFING]: 'roofing',
  [TradeCategory.PAINTING]: 'painting',
  [TradeCategory.LANDSCAPING]: 'landscaping',
  [TradeCategory.GENERAL_CONTRACTING]: 'general contracting',
  [TradeCategory.CARPENTRY]: 'carpentry',
  [TradeCategory.FLOORING]: 'flooring',
  [TradeCategory.PEST_CONTROL]: 'pest control',
  [TradeCategory.DOORS_AND_WINDOWS]: 'doors and windows',
  [TradeCategory.POOL_AND_SPA]: 'pool and spa',
};

const CATEGORY_RULES: Array<{ category: TradeCategory; terms: string[]; reason: string }> = [
  { category: TradeCategory.PLUMBING, terms: ['bathroom', 'toilet', 'shower', 'tub', 'sink', 'faucet', 'pipe', 'drain', 'water', 'leak', 'plumb', 'fixture', 'vanity'], reason: 'The description mentions water, drains, fixtures, or bathroom work that usually needs a plumber.' },
  { category: TradeCategory.ELECTRICAL, terms: ['outlet', 'switch', 'breaker', 'panel', 'wire', 'wiring', 'light', 'lighting', 'ev charger', 'fan', 'electrical', 'power'], reason: 'The description mentions power, wiring, lighting, outlets, or panel work that requires an electrician.' },
  { category: TradeCategory.HVAC, terms: ['hvac', 'ac', 'a/c', 'air conditioner', 'furnace', 'heat pump', 'thermostat', 'duct', 'vent', 'heating', 'cooling'], reason: 'The description points to heating, cooling, thermostat, duct, or ventilation work.' },
  { category: TradeCategory.ROOFING, terms: ['roof', 'shingle', 'gutter', 'downspout', 'flashing', 'attic leak', 'soffit', 'fascia'], reason: 'The description mentions roof, gutter, flashing, or exterior water-shedding work.' },
  { category: TradeCategory.PAINTING, terms: ['paint', 'repaint', 'stain', 'wall color', 'exterior color', 'interior color', 'peeling'], reason: 'The description includes painting, staining, peeling paint, or a color refresh.' },
  { category: TradeCategory.LANDSCAPING, terms: ['yard', 'lawn', 'tree', 'garden', 'drainage', 'patio', 'deck', 'fence', 'outdoor', 'landscap', 'irrigation', 'sprinkler'], reason: 'The description involves outdoor site work, yard changes, drainage, or landscaping.' },
  { category: TradeCategory.GENERAL_CONTRACTING, terms: ['remodel', 'renovation', 'addition', 'kitchen', 'bathroom', 'layout', 'wall removal', 'permit', 'multiple trades', 'project management'], reason: 'The description sounds like a multi-trade remodel or larger project that needs coordination.' },
  { category: TradeCategory.CARPENTRY, terms: ['cabinet', 'built-in', 'shelf', 'trim', 'baseboard', 'door frame', 'wood', 'carpentry', 'deck', 'framing'], reason: 'The description mentions cabinets, trim, framing, built-ins, or custom woodwork.' },
  { category: TradeCategory.FLOORING, terms: ['floor', 'flooring', 'tile', 'hardwood', 'carpet', 'vinyl', 'lvp', 'laminate'], reason: 'The description mentions floor replacement, tile, carpet, hardwood, vinyl, or related surface work.' },
  { category: TradeCategory.PEST_CONTROL, terms: ['pest', 'termite', 'ant', 'rodent', 'mouse', 'mice', 'rat', 'roach', 'wasp'], reason: 'The description mentions insects, termites, rodents, or pest prevention.' },
  { category: TradeCategory.DOORS_AND_WINDOWS, terms: ['window', 'windows', 'door', 'doors', 'sliding door', 'draft', 'seal', 'glass', 'lock', 'hinge'], reason: 'The description mentions doors, windows, drafts, seals, glass, or related hardware.' },
  { category: TradeCategory.POOL_AND_SPA, terms: ['pool', 'spa', 'hot tub', 'pump', 'filter', 'chlorine'], reason: 'The description mentions a pool, spa, pump, filter, or water chemistry.' },
];

function termMatches(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const suffix = term.length <= 3 ? '' : '[a-z0-9-]*';
  return new RegExp(`(^|[^a-z0-9])${escaped}${suffix}([^a-z0-9]|$)`).test(text);
}

export async function createJob(homeId: string, userId: string, data: CreateJobData) {
  const confirmedCategories = data.categories?.length ? data.categories : [data.category];
  const aiSession = data.aiSession || data.categories?.length
    ? {
        messages: data.aiSession?.messages ?? [],
        summary: data.aiSession?.summary ?? null,
        categorySuggestions: data.aiSession?.categorySuggestions,
        confirmedCategories,
      }
    : undefined;

  return JobManager.create({
    id: createId(),
    homeId,
    createdByUserId: userId,
    title: data.title,
    intent: data.intent ?? JobIntent.ISSUE,
    category: data.category,
    description: data.description ?? null,
    notes: data.notes ?? null,
    status: data.status ?? 'DRAFT',
    aiSession: aiSession as any,
    updatedAt: new Date(),
  });
}

export async function suggestTradeCategories(data: {
  intent: JobIntent;
  title: string;
  description?: string;
  selectedCategories?: TradeCategory[];
}): Promise<{ suggestions: TradeCategorySuggestion[] }> {
  const text = `${data.title} ${data.description ?? ''}`.toLowerCase();
  const suggestions = new Map<TradeCategory, string>();

  for (const rule of CATEGORY_RULES) {
    if (rule.terms.some((term) => termMatches(text, term))) {
      suggestions.set(rule.category, rule.reason);
    }
  }

  for (const category of data.selectedCategories ?? []) {
    if (!suggestions.has(category)) {
      suggestions.set(category, `You already selected ${CATEGORY_LABELS[category]}, so it is included unless you remove it.`);
    }
  }

  if (data.intent === JobIntent.IMPROVEMENT && suggestions.size > 1 && !suggestions.has(TradeCategory.GENERAL_CONTRACTING)) {
    suggestions.set(
      TradeCategory.GENERAL_CONTRACTING,
      'Several trades appear to be involved, so a general contractor may be useful to coordinate the project.'
    );
  }

  if (suggestions.size === 0) {
    suggestions.set(
      TradeCategory.GENERAL_CONTRACTING,
      'The description does not clearly point to a single specialty trade, so general contracting is the safest starting category.'
    );
  }

  return {
    suggestions: Array.from(suggestions.entries()).map(([category, reason]) => ({ category, reason })),
  };
}

export async function getJob(jobId: string) {
  const job = await JobManager.findById(jobId);
  if (!job) throw new NotFoundError('Job');

  const [contractors, images, quotes, communications, aiGenerations] = await Promise.all([
    JobContractorManager.listForJob(jobId),
    import('../ai/models/JobImageManager').then((m) => m.JobImageManager.listForJob(jobId)),
    import('../quote/models/QuoteManager').then((m) => m.QuoteManager.listForJob(jobId)),
    import('../communication/models/CommunicationManager').then((m) => m.CommunicationManager.listForJob(jobId)),
    import('../ai/models/AIGenerationManager').then((m) => m.AIGenerationManager.listForJob(jobId)),
  ]);

  return { ...job, contractors, images, quotes, communications, aiGenerations };
}

export async function updateJob(jobId: string, data: UpdateJobData) {
  const { categories, aiSession, ...jobData } = data;
  const confirmedCategories = categories?.length ? categories : aiSession?.confirmedCategories;
  return JobManager.update(jobId, {
    ...jobData,
    category: confirmedCategories?.[0] ?? jobData.category,
    aiSession: aiSession || confirmedCategories?.length
      ? {
          messages: aiSession?.messages ?? [],
          summary: aiSession?.summary ?? null,
          categorySuggestions: aiSession?.categorySuggestions,
          confirmedCategories,
        } as any
      : undefined,
  });
}

export async function deleteJob(jobId: string) {
  await JobManager.delete(jobId);
}

export async function listJobContractors(jobId: string) {
  return JobContractorManager.listForJob(jobId);
}

export async function assignContractor(jobId: string, contractorId: string, notes?: string) {
  return JobContractorManager.upsert(jobId, contractorId, notes);
}

export async function updateJobContractorStatus(jobContractorId: string, status: JobContractorStatus, notes?: string) {
  const jc = await JobContractorManager.findById(jobContractorId);
  if (!jc) throw new NotFoundError('JobContractor');
  return JobContractorManager.updateStatus(jobContractorId, status as any, notes);
}

export async function removeContractorFromJob(jobContractorId: string) {
  const jc = await JobContractorManager.findById(jobContractorId);
  if (!jc) throw new NotFoundError('JobContractor');
  await JobContractorManager.delete(jobContractorId);
}
