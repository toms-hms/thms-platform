import OpenAI from 'openai';
import { prisma } from '../config/prisma';
import { getDownloadUrl } from './upload.service';
import { s3Client, BUCKET_NAME } from '../config/minio';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

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
  const sourceImage = await prisma.jobImage.findUnique({ where: { id: data.sourceImageId } });
  if (!sourceImage) throw new Error('Source image not found');

  const originalImageUrl = await getDownloadUrl(sourceImage.storageKey);

  // Create pending record
  const generation = await prisma.aIGeneration.create({
    data: {
      jobId: data.jobId,
      originalImageUrl,
      prompt: data.prompt,
      provider: data.provider,
      status: 'PROCESSING',
      metadata: (data.metadata || {}) as any,
      createdByUserId: data.userId,
    },
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

    // Fetch and store the generated image in MinIO
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const key = `jobs/${data.jobId}/generated/${randomUUID()}.png`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/png',
      })
    );

    const generatedImageUrl = await getDownloadUrl(key);

    // Create JobImage record for the generated image
    await prisma.jobImage.create({
      data: {
        jobId: data.jobId,
        storageKey: key,
        kind: 'GENERATED',
        label: `AI Generated: ${data.prompt.slice(0, 50)}`,
        aiGenerationId: generation.id,
        uploadedById: data.userId,
      },
    });

    const updated = await prisma.aIGeneration.update({
      where: { id: generation.id },
      data: {
        generatedImageUrl,
        status: 'COMPLETED',
      },
    });

    return updated;
  } catch (err) {
    await prisma.aIGeneration.update({
      where: { id: generation.id },
      data: { status: 'FAILED' },
    });
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
  const job = await prisma.job.findUnique({
    where: { id: data.jobId },
    include: { home: true },
  });
  if (!job) throw new Error('Job not found');

  const contractors = await prisma.contractor.findMany({
    where: { id: { in: data.contractorIds } },
  });

  const openai = getOpenAI();

  const drafts: Array<{ contractorId: string; subject: string; bodyText: string; bodyHtml: string }> = [];

  for (const contractor of contractors) {
    const systemPrompt = `You are helping a homeowner write a professional outreach email to a contractor for a home improvement project. Write in a ${data.tone} tone. Be concise and specific.`;

    const userPrompt = `Write an outreach email to ${contractor.name}${contractor.companyName ? ` at ${contractor.companyName}` : ''} for the following project:

Job: ${job.title}
Category: ${job.category}
Description: ${job.description || 'Not provided'}
Location: ${job.home.city}, ${job.home.state}

${data.customInstructions ? `Additional instructions: ${data.customInstructions}` : ''}

Return a JSON object with these fields:
- subject: email subject line
- bodyText: plain text email body
- bodyHtml: HTML formatted email body`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) continue;

    const parsed = JSON.parse(content);

    await prisma.aIGeneration.create({
      data: {
        jobId: data.jobId,
        prompt: userPrompt,
        provider: 'openai',
        status: 'COMPLETED',
        metadata: { contractorId: contractor.id, type: 'EMAIL_DRAFT' },
        createdByUserId: data.userId,
      },
    });

    drafts.push({
      contractorId: contractor.id,
      subject: parsed.subject,
      bodyText: parsed.bodyText,
      bodyHtml: parsed.bodyHtml,
    });
  }

  return drafts;
}

export async function listAIGenerations(jobId: string) {
  return prisma.aIGeneration.findMany({
    where: { jobId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function retryGeneration(generationId: string, userId: string) {
  const gen = await prisma.aIGeneration.findUnique({ where: { id: generationId } });
  if (!gen) throw new Error('Generation not found');
  if (gen.status !== 'FAILED') throw new Error('Can only retry failed generations');

  const sourceImage = gen.originalImageUrl
    ? await prisma.jobImage.findFirst({ where: { jobId: gen.jobId, kind: 'SOURCE' } })
    : null;

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
