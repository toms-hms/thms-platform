import OpenAI from 'openai';
import { JobIntent } from '@thms/shared';
import { eq } from 'drizzle-orm';
import { getDownloadUrl } from '../upload/service';
import { s3Client, BUCKET_NAME } from '../config/minio';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { createId } from '@paralleldrive/cuid2';
import { env } from '../config/env';
import { AIGenerationManager } from './models/AIGenerationManager';
import { JobImageManager } from './models/JobImageManager';
import { JobManager } from '../job/models/JobManager';
import { ContractorManager } from '../contractor/models/ContractorManager';
import { HomeManager } from '../home/models/HomeManager';
import { db } from '../db';
import { contractors } from '../contractor/models/Contractor';
import { jobs } from '../job/models/Job';
import { homes } from '../home/models/Home';

function getOpenAI() {
  if (!env.OPENAI_API_KEY) throw new Error('OpenAI API key not configured');
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export async function generateImage(data: {
  jobId: string;
  userId: string;
  sourceImageId: string;
  prompt: string;
  provider: string;
  metadata?: Record<string, unknown>;
}) {
  const sourceImage = await JobImageManager.findById(data.sourceImageId);
  if (!sourceImage) throw new Error('Source image not found');

  const originalImageUrl = await getDownloadUrl(sourceImage.storageKey);

  const generation = await AIGenerationManager.create({
    id: createId(),
    jobId: data.jobId,
    originalImageUrl,
    prompt: data.prompt,
    provider: data.provider,
    status: 'PROCESSING',
    metadata: data.metadata ?? null,
    createdByUserId: data.userId,
    updatedAt: new Date(),
  });

  try {
    const openai = getOpenAI();
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `${data.prompt}. Important: Only modify the outdoor/yard areas as described. Do not change the structure, style, or appearance of the house.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL returned from OpenAI');

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const key = `jobs/${data.jobId}/generated/${randomUUID()}.png`;
    await s3Client.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, Body: imageBuffer, ContentType: 'image/png' }));

    const generatedImageUrl = await getDownloadUrl(key);

    await JobImageManager.create({
      id: createId(),
      jobId: data.jobId,
      storageKey: key,
      kind: 'GENERATED',
      label: `AI Generated: ${data.prompt.slice(0, 50)}`,
      aiGenerationId: generation.id,
      uploadedById: data.userId,
    });

    return AIGenerationManager.update(generation.id, { generatedImageUrl, status: 'COMPLETED' });
  } catch (err) {
    await AIGenerationManager.update(generation.id, { status: 'FAILED' });
    throw err;
  }
}

export async function draftEmail(data: {
  jobId: string;
  contractorIds: string[];
  tone: string;
  includeImages: boolean;
  customInstructions?: string;
  userId: string;
}) {
  const job = await JobManager.findById(data.jobId);
  if (!job) throw new Error('Job not found');
  const home = await HomeManager.findById(job.homeId);
  if (!home) throw new Error('Home not found');

  const contractorResults = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, data.contractorIds[0]));
  // Fetch all contractors in the list
  const contractorList = await Promise.all(data.contractorIds.map((id) => ContractorManager.findById(id)));
  const validContractors = contractorList.filter(Boolean) as NonNullable<typeof contractorList[0]>[];

  const openai = getOpenAI();
  const drafts: Array<{ contractorId: string; subject: string; bodyText: string; bodyHtml: string }> = [];

  for (const contractor of validContractors) {
    const systemPrompt = `You are helping a homeowner write a professional outreach email to a contractor for a home improvement project. Write in a ${data.tone} tone. Be concise and specific.`;
    const userPrompt = `Write an outreach email to ${contractor.name}${contractor.companyName ? ` at ${contractor.companyName}` : ''} for the following project:

Job: ${job.title}
Category: ${job.category}
Description: ${job.description || 'Not provided'}
Location: ${home.city}, ${home.state}

${data.customInstructions ? `Additional instructions: ${data.customInstructions}` : ''}

Return a JSON object with these fields:
- subject: email subject line
- bodyText: plain text email body
- bodyHtml: HTML formatted email body`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) continue;
    const parsed = JSON.parse(content);

    await AIGenerationManager.create({
      id: createId(),
      jobId: data.jobId,
      prompt: userPrompt,
      provider: 'openai',
      status: 'COMPLETED',
      metadata: { contractorId: contractor.id, type: 'EMAIL_DRAFT' },
      createdByUserId: data.userId,
      originalImageUrl: null,
      generatedImageUrl: null,
      updatedAt: new Date(),
    });

    drafts.push({ contractorId: contractor.id, subject: parsed.subject, bodyText: parsed.bodyText, bodyHtml: parsed.bodyHtml });
  }

  return drafts;
}

const SYSTEM_PROMPTS: Record<JobIntent, string> = {
  [JobIntent.ISSUE]: `You are helping a homeowner describe a home problem so contractors can quote accurately without a site visit.
Ask focused questions with suggested options. Cover: what is broken, when it started, urgency, and contractor context.
Always call ask_question for your next question. After 2-4 exchanges call generate_summary.
If the answers reveal the selected trade categories are wrong or incomplete, also call suggest_categories — but only if genuinely needed.`,

  [JobIntent.IMPROVEMENT]: `You are helping a homeowner scope a home improvement project so contractors can submit comparable bids.
Ask focused questions with suggested options. Cover: desired outcome, budget range, timeline, constraints.
Always call ask_question for your next question. After 2-4 exchanges call generate_summary.
If the answers reveal the selected trade categories are wrong or incomplete, also call suggest_categories — but only if genuinely needed.`,

  [JobIntent.RECURRING_WORK]: `You are helping a homeowner define a recurring home maintenance service so contractors can bid a repeating contract.
Ask focused questions with suggested options. Cover: tasks, frequency, access and timing constraints.
Always call ask_question for your next question. After 2-4 exchanges call generate_summary.
If the answers reveal the selected trade categories are wrong or incomplete, also call suggest_categories — but only if genuinely needed.`,
};

const SUGGEST_CATEGORIES_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'suggest_categories',
    description: 'Call this only if the answers reveal the initially selected trade categories are wrong or incomplete. Suggest the correct categories with a reason for each.',
    parameters: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'TradeCategory enum value e.g. PLUMBING, HVAC.' },
              reason:   { type: 'string', description: 'One sentence explaining why this category is needed.' },
            },
            required: ['category', 'reason'],
          },
        },
      },
      required: ['suggestions'],
    },
  },
};

const ASK_QUESTION_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'ask_question',
    description: 'Ask the homeowner the next clarifying question with suggested answer options.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to ask.' },
        options:  { type: 'array', items: { type: 'string' }, description: '3-4 suggested answers the homeowner can pick or ignore.' },
      },
      required: ['question', 'options'],
    },
  },
};

const SUMMARY_TOOLS: Record<JobIntent, OpenAI.Chat.Completions.ChatCompletionTool> = {
  [JobIntent.ISSUE]: {
    type: 'function',
    function: {
      name: 'generate_summary',
      description: 'Generate a contractor-ready brief once you have enough context.',
      parameters: {
        type: 'object',
        properties: {
          rootCause:   { type: 'string', description: 'What is broken or wrong, in plain language.' },
          severity:    { type: 'string', description: 'How urgent — e.g. "urgent", "moderate", "low".' },
          scope:       { type: 'string', description: 'Full contractor-ready brief.' },
          priceRange:  { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
          constraints: { type: 'array', items: { type: 'string' } },
        },
        required: ['rootCause', 'severity', 'scope', 'priceRange', 'constraints'],
      },
    },
  },
  [JobIntent.IMPROVEMENT]: {
    type: 'function',
    function: {
      name: 'generate_summary',
      description: 'Generate a contractor-ready scope of work once you have enough context.',
      parameters: {
        type: 'object',
        properties: {
          scope:       { type: 'string', description: 'Full scope of work.' },
          priceRange:  { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
          constraints: { type: 'array', items: { type: 'string' } },
        },
        required: ['scope', 'priceRange', 'constraints'],
      },
    },
  },
  [JobIntent.RECURRING_WORK]: {
    type: 'function',
    function: {
      name: 'generate_summary',
      description: 'Generate a recurring service specification once you have enough context.',
      parameters: {
        type: 'object',
        properties: {
          frequency:   { type: 'string', description: 'How often — e.g. "weekly", "quarterly".' },
          scope:       { type: 'string', description: 'Full service spec.' },
          priceRange:  { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
          constraints: { type: 'array', items: { type: 'string' } },
        },
        required: ['frequency', 'scope', 'priceRange'],
      },
    },
  },
};

interface DiagnoseResult {
  question: string | null;
  options: string[];
  summary: ReturnType<typeof JobManager.findById> extends Promise<infer T> ? T extends null ? never : NonNullable<T>['aiSession'] extends infer S ? S extends null | undefined ? never : NonNullable<S>['summary'] : never : never;
  suggestedCategories: Array<{ category: string; reason: string }> | null;
  messages: Array<{ role: string; content: string }>;
}

/** Conducts one turn of the AI diagnostic Q&A. Returns the next question, and optionally a summary and/or category suggestions. */
export async function diagnoseJob(jobId: string, userMessage: string) {
  const job = await JobManager.findById(jobId);
  if (!job) throw new Error('Job not found');

  const openai = getOpenAI();
  const intent = job.intent as JobIntent;
  const systemPrompt = SYSTEM_PROMPTS[intent] ?? SYSTEM_PROMPTS[JobIntent.ISSUE];
  const summaryTool = SUMMARY_TOOLS[intent] ?? SUMMARY_TOOLS[JobIntent.ISSUE];

  const existingSession = job.aiSession ?? { messages: [], summary: null };
  const newUserMessage = { role: 'user' as const, content: userMessage };
  const history = [...existingSession.messages, newUserMessage];

  const contextPrefix = [
    `Job title: ${job.title}`,
    `Category: ${job.category}`,
    job.description ? `Homeowner's description: ${job.description}` : null,
  ].filter(Boolean).join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: `${systemPrompt}\n\n${contextPrefix}` },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
    tools: [ASK_QUESTION_TOOL, SUGGEST_CATEGORIES_TOOL, summaryTool],
    tool_choice: 'required',
  });

  const choice = response.choices[0];
  // The model may call multiple tools in one turn (e.g. suggest_categories + ask_question)
  const toolCalls = choice.message.tool_calls ?? [];

  let question: string | null = null;
  let options: string[] = [];
  let summary = existingSession.summary;
  let suggestedCategories: Array<{ category: string; reason: string }> | null = null;

  for (const toolCall of toolCalls) {
    const args = JSON.parse(toolCall.function.arguments);
    if (toolCall.function.name === 'ask_question') {
      question = args.question;
      options = args.options ?? [];
    } else if (toolCall.function.name === 'generate_summary') {
      summary = { intent: job.intent, ...args } as typeof summary;
    } else if (toolCall.function.name === 'suggest_categories') {
      suggestedCategories = args.suggestions ?? [];
    }
  }

  const assistantContent = question ?? 'Brief complete.';
  const updatedMessages = [...history, { role: 'assistant' as const, content: assistantContent }];

  await JobManager.update(jobId, {
    aiSession: { messages: updatedMessages, summary },
  });

  return { question, options, summary, suggestedCategories, messages: updatedMessages };
}

/** Returns the first question for a job's diagnostic session (no user message needed). */
export async function startDiagnose(jobId: string) {
  const job = await JobManager.findById(jobId);
  if (!job) throw new Error('Job not found');

  const openai = getOpenAI();
  const intent = job.intent as JobIntent;
  const systemPrompt = SYSTEM_PROMPTS[intent] ?? SYSTEM_PROMPTS[JobIntent.ISSUE];
  const summaryTool = SUMMARY_TOOLS[intent] ?? SUMMARY_TOOLS[JobIntent.ISSUE];

  const contextPrefix = [
    `Job title: ${job.title}`,
    `Category: ${job.category}`,
    job.description ? `Homeowner's description: ${job.description}` : null,
  ].filter(Boolean).join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: `${systemPrompt}\n\n${contextPrefix}` },
      { role: 'user', content: 'Start the diagnostic.' },
    ],
    tools: [ASK_QUESTION_TOOL, SUGGEST_CATEGORIES_TOOL, summaryTool],
    tool_choice: 'required',
  });

  const toolCalls = response.choices[0].message.tool_calls ?? [];
  let question: string | null = null;
  let options: string[] = [];
  let suggestedCategories: Array<{ category: string; reason: string }> | null = null;

  for (const toolCall of toolCalls) {
    const args = JSON.parse(toolCall.function.arguments);
    if (toolCall.function.name === 'ask_question') {
      question = args.question;
      options = args.options ?? [];
    } else if (toolCall.function.name === 'suggest_categories') {
      suggestedCategories = args.suggestions ?? [];
    }
  }

  await JobManager.update(job.id, {
    aiSession: { messages: [{ role: 'assistant', content: question ?? '' }], summary: null },
  });

  return { question, options, summary: null, suggestedCategories, messages: [{ role: 'assistant', content: question ?? '' }] };
}

export async function listAIGenerations(jobId: string) {
  return AIGenerationManager.listForJob(jobId);
}

export async function retryGeneration(generationId: string, userId: string) {
  const gen = await AIGenerationManager.findById(generationId);
  if (!gen) throw new Error('Generation not found');
  if (gen.status !== 'FAILED') throw new Error('Can only retry failed generations');

  const images = await JobImageManager.listForJob(gen.jobId);
  const sourceImage = images.find((img) => img.kind === 'SOURCE');
  if (!sourceImage) throw new Error('Source image not found');

  return generateImage({
    jobId: gen.jobId,
    userId,
    sourceImageId: sourceImage.id,
    prompt: gen.prompt,
    provider: gen.provider,
    metadata: gen.metadata as Record<string, unknown> | undefined,
  });
}
