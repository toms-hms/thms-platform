import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import type { CreateJobInput, UpdateJobInput } from '@thms/shared';
import { JobContractorStatus } from '@thms/shared';

export async function listJobs(
  homeId: string,
  userId: string,
  filters?: { status?: string; category?: string }
) {
  // Verify user has access to this home
  const userHome = await prisma.userHome.findUnique({
    where: { userId_homeId: { userId, homeId } },
  });
  if (!userHome) throw new NotFoundError('Home');

  return prisma.job.findMany({
    where: {
      homeId,
      ...(filters?.status && { status: filters.status as any }),
      ...(filters?.category && { category: filters.category }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createJob(homeId: string, userId: string, data: CreateJobInput) {
  const userHome = await prisma.userHome.findUnique({
    where: { userId_homeId: { userId, homeId } },
  });
  if (!userHome) throw new NotFoundError('Home');

  return prisma.job.create({
    data: {
      homeId,
      createdByUserId: userId,
      title: data.title,
      category: data.category,
      description: data.description,
      notes: data.notes,
      status: data.status || 'DRAFT',
    },
  });
}

export async function getJob(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      contractors: {
        include: { contractor: true },
        orderBy: { createdAt: 'asc' },
      },
      images: {
        orderBy: { createdAt: 'desc' },
      },
      quotes: {
        include: { contractor: true },
        orderBy: { createdAt: 'desc' },
      },
      communications: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      aiGenerations: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!job) throw new NotFoundError('Job');

  // Check user has access via home
  const userHome = await prisma.userHome.findUnique({
    where: { userId_homeId: { userId, homeId: job.homeId } },
  });
  if (!userHome) throw new NotFoundError('Job');

  return job;
}

export async function updateJob(jobId: string, userId: string, data: UpdateJobInput) {
  await getJob(jobId, userId);

  return prisma.job.update({
    where: { id: jobId },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.category && { category: data.category }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.status && { status: data.status as any }),
    },
  });
}

export async function deleteJob(jobId: string, userId: string) {
  await getJob(jobId, userId);
  await prisma.job.delete({ where: { id: jobId } });
}

export async function assignContractor(
  jobId: string,
  userId: string,
  contractorId: string,
  notes?: string
) {
  await getJob(jobId, userId);

  return prisma.jobContractor.upsert({
    where: { jobId_contractorId: { jobId, contractorId } },
    create: {
      jobId,
      contractorId,
      status: 'NOT_CONTACTED',
      notes,
    },
    update: { notes },
    include: { contractor: true },
  });
}

export async function updateJobContractorStatus(
  jobContractorId: string,
  userId: string,
  status: JobContractorStatus,
  notes?: string
) {
  const jc = await prisma.jobContractor.findUnique({
    where: { id: jobContractorId },
    include: { job: true },
  });

  if (!jc) throw new NotFoundError('JobContractor');

  const userHome = await prisma.userHome.findUnique({
    where: { userId_homeId: { userId, homeId: jc.job.homeId } },
  });
  if (!userHome) throw new NotFoundError('JobContractor');

  const updateData: any = { status, updatedAt: new Date() };
  if (notes !== undefined) updateData.notes = notes;

  const contacted = [
    'CONTACTED', 'RESPONDED', 'VISIT_REQUESTED', 'VISIT_SCHEDULED',
    'VISIT_COMPLETED', 'QUOTE_RECEIVED', 'ACCEPTED', 'WORK_IN_PROGRESS',
    'WORK_COMPLETED', 'PAID',
  ];
  const responded = [
    'RESPONDED', 'VISIT_REQUESTED', 'VISIT_SCHEDULED', 'VISIT_COMPLETED',
    'QUOTE_RECEIVED', 'ACCEPTED', 'WORK_IN_PROGRESS', 'WORK_COMPLETED', 'PAID',
  ];

  if (contacted.includes(status) && !jc.lastContactedAt) {
    updateData.lastContactedAt = new Date();
  }
  if (responded.includes(status) && !jc.lastResponseAt) {
    updateData.lastResponseAt = new Date();
  }

  return prisma.jobContractor.update({
    where: { id: jobContractorId },
    data: updateData,
    include: { contractor: true },
  });
}

export async function removeContractorFromJob(jobContractorId: string, userId: string) {
  const jc = await prisma.jobContractor.findUnique({
    where: { id: jobContractorId },
    include: { job: true },
  });

  if (!jc) throw new NotFoundError('JobContractor');

  const userHome = await prisma.userHome.findUnique({
    where: { userId_homeId: { userId, homeId: jc.job.homeId } },
  });
  if (!userHome) throw new NotFoundError('JobContractor');

  await prisma.jobContractor.delete({ where: { id: jobContractorId } });
}
