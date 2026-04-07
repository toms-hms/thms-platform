import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import type { CreateQuoteInput, UpdateQuoteInput } from '@thms/shared';

export async function listQuotes(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { home: { include: { users: { where: { userId } } } } },
  });

  if (!job || job.home.users.length === 0) throw new NotFoundError('Job');

  return prisma.quote.findMany({
    where: { jobId },
    include: { contractor: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createQuote(jobId: string, userId: string, data: CreateQuoteInput) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { home: { include: { users: { where: { userId } } } } },
  });

  if (!job || job.home.users.length === 0) throw new NotFoundError('Job');

  return prisma.quote.create({
    data: {
      jobId,
      contractorId: data.contractorId,
      amount: data.amount,
      description: data.description,
      status: data.status || 'DRAFT',
      sourceCommunicationId: data.sourceCommunicationId,
    },
    include: { contractor: true },
  });
}

export async function updateQuote(quoteId: string, data: UpdateQuoteInput) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new NotFoundError('Quote');

  return prisma.quote.update({
    where: { id: quoteId },
    data,
    include: { contractor: true },
  });
}

export async function deleteQuote(quoteId: string) {
  await prisma.quote.delete({ where: { id: quoteId } });
}
