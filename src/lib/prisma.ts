import prismaClient from '@prisma/client';
import prismaAdapterPg from '@prisma/adapter-pg';

const { PrismaClient } = prismaClient;
const { PrismaPg } = prismaAdapterPg;

export const Decimal = prismaClient.Prisma.Decimal;

const globalForPrisma = globalThis as unknown as { prisma?: InstanceType<typeof PrismaClient> };

function createClient(): InstanceType<typeof PrismaClient> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
