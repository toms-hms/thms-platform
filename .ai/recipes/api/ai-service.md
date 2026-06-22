---
name: api-ai-service
description: Guide for writing AI service functions that use OpenAI — tool calling, multi-turn conversations, JSON mode, and intent-discriminated prompts.
---

# AI Service (OpenAI Tool Use)

AI features live in `src/ai/service.ts` and `src/ai/route.ts`. They follow the same service/route split as other modules.

## OpenAI client — lazy instantiation

The client is created inside a helper function so it throws at call time (not import time) when the API key is absent:

```typescript
import OpenAI from 'openai';
import { env } from '../config/env';

function getOpenAI() {
  if (!env.OPENAI_API_KEY) throw new Error('OpenAI API key not configured');
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}
```

## JSON mode — `response_format: { type: 'json_object' }`

Use for structured outputs where you control the schema via the prompt. The model is guaranteed to return valid JSON.

```typescript
export async function draftEmail(data: {
  jobId: string;
  contractorIds: string[];
  tone: string;
  customInstructions?: string;
  userId: string;
}) {
  const job   = await JobManager.get({ id: data.jobId });
  const home  = await HomeManager.get({ id: job.homeId });
  const contractors = await ContractorManager.filter({ ids: data.contractorIds });
  const openai = getOpenAI();

  const drafts: Array<{ contractorId: string; subject: string; bodyText: string; bodyHtml: string }> = [];

  for (const contractor of contractors) {
    const systemPrompt = `You are helping a homeowner write a professional outreach email to a contractor. Write in a ${data.tone} tone.`;
    const userPrompt = `Write an outreach email to ${contractor.name} for:

Job: ${job.title} (${job.category})
Description: ${job.description ?? 'Not provided'}
Location: ${home.city}, ${home.state}
${data.customInstructions ? `\nAdditional instructions: ${data.customInstructions}` : ''}

Return JSON with: subject, bodyText, bodyHtml`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}');
    drafts.push({ contractorId: contractor.id, ...parsed });
  }

  return drafts;
}
```

## Tool calling — multi-turn diagnostic conversation

Tool calling allows the model to express structured intent (ask a question, suggest categories, generate a summary) instead of returning free text. The route stores conversation history in the job's `aiSession.messages`.

### Tool definitions

```typescript
const ASK_QUESTION_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'ask_question',
    description: 'Ask the homeowner the next clarifying question with suggested answer options.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to ask.' },
        options:  { type: 'array', items: { type: 'string' }, description: '3-4 suggested answers.' },
      },
      required: ['question', 'options'],
    },
  },
};

const SUGGEST_CATEGORIES_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'suggest_categories',
    description: 'Call only if answers reveal the initially selected trade categories are wrong or incomplete.',
    parameters: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'TradeCategory enum value, e.g. PLUMBING.' },
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

const GENERATE_SUMMARY_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'generate_summary',
    description: 'Call after 2-4 exchanges to produce a contractor-ready job brief.',
    parameters: {
      type: 'object',
      properties: {
        rootCause:   { type: 'string' },
        severity:    { type: 'string' },
        scope:       { type: 'string' },
        priceRange:  { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
        constraints: { type: 'array', items: { type: 'string' } },
      },
      required: ['rootCause', 'severity', 'scope', 'priceRange', 'constraints'],
    },
  },
};
```

### Intent-discriminated system prompts

Each job intent gets a different system prompt that shapes the diagnostic conversation:

```typescript
const SYSTEM_PROMPTS: Record<JobIntent, string> = {
  [JobIntent.ISSUE]: `You are helping a homeowner describe a home problem so contractors can quote accurately.
Ask focused questions with suggested options. Cover: what is broken, when it started, urgency, contractor context.
Always call ask_question for your next question. After 2-4 exchanges call generate_summary.
Only call suggest_categories if the answers reveal the selected categories are genuinely wrong.`,

  [JobIntent.IMPROVEMENT]: `You are helping a homeowner scope a home improvement project for comparable bids.
Cover: desired outcome, budget range, timeline, constraints.
Always call ask_question first. After 2-4 exchanges call generate_summary.`,

  [JobIntent.RECURRING_WORK]: `You are helping a homeowner define a recurring maintenance service for a repeating contract bid.
Cover: tasks, frequency, access and timing constraints.
Always call ask_question first. After 2-4 exchanges call generate_summary.`,
};
```

### Multi-turn conversation handler

```typescript
export async function diagnoseJob(data: {
  jobId: string;
  message: string;
  userId: string;
}) {
  const job = await JobManager.get({ id: data.jobId });
  const session = job.aiSession ?? { messages: [], summary: null };
  const intent  = job.intent ?? JobIntent.ISSUE;

  // Append the homeowner's message to conversation history
  const updatedMessages = [
    ...session.messages,
    { role: 'user' as const, content: data.message },
  ];

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS[intent] },
      ...updatedMessages,
    ],
    tools: [ASK_QUESTION_TOOL, SUGGEST_CATEGORIES_TOOL, GENERATE_SUMMARY_TOOL],
    tool_choice: 'required',
  });

  const choice = response.choices[0];
  const toolCall = choice.message.tool_calls?.[0];
  if (!toolCall) throw new Error('Model returned no tool call');

  const args = JSON.parse(toolCall.function.arguments);

  // Persist the assistant's tool-call turn in the session
  const assistantTurn = { role: 'assistant' as const, content: JSON.stringify(args) };
  const finalMessages = [...updatedMessages, assistantTurn];

  let summary = session.summary;
  let categorySuggestions = session.categorySuggestions ?? [];

  if (toolCall.function.name === 'generate_summary') {
    summary = { intent, ...args };
  } else if (toolCall.function.name === 'suggest_categories') {
    categorySuggestions = args.suggestions;
  }

  // Write updated session back to the job
  await JobManager.update(job.id, {
    aiSession: { ...session, messages: finalMessages, summary, categorySuggestions },
    updatedAt: new Date(),
  });

  return {
    toolName: toolCall.function.name,
    args,
    sessionComplete: toolCall.function.name === 'generate_summary',
  };
}
```

## Mocking in tests

OpenAI is mocked globally via `src/test/__mocks__/openai.js`. Tests should not make real API calls. Use `jest.spyOn` to assert the model was called with the right messages when needed.

## Image generation

Use `dall-e-3` via `openai.images.generate()`. Download the result URL immediately — it expires. Store in MinIO and create a `JobImage` record before returning:

```typescript
const response = await openai.images.generate({
  model: 'dall-e-3',
  prompt: `${data.prompt}. Only modify outdoor/yard areas. Do not change the house structure.`,
  n: 1,
  size: '1024x1024',
  quality: 'standard',
});

const imageUrl = response.data?.[0]?.url;
// fetch + store in MinIO + create JobImage record
```
