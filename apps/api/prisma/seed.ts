import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@thms.com' },
    update: {},
    create: {
      email: 'admin@thms.com',
      passwordHash,
      firstName: 'Tom',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    },
  });

  console.log('Created user:', user.email);

  const home = await prisma.home.upsert({
    where: { id: 'seed-home-1' },
    update: {},
    create: {
      id: 'seed-home-1',
      name: 'Primary Residence',
      address1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zipCode: '78745',
      notes: 'My main home',
      users: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  });

  console.log('Created home:', home.name);

  const contractor = await prisma.contractor.upsert({
    where: { id: 'seed-contractor-1' },
    update: {},
    create: {
      id: 'seed-contractor-1',
      name: 'John Smith',
      companyName: 'Smith Decks',
      email: 'john@smithdecks.com',
      phone: '5125551212',
      category: 'deck',
      notes: 'Good local recommendation',
      users: {
        create: { userId: user.id },
      },
    },
  });

  console.log('Created contractor:', contractor.name);

  console.log('Seed complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
