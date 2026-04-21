import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createId } from '@paralleldrive/cuid2';
import { db } from './index';
import { users } from '../auth/models/User';
import { homes } from '../home/models/Home';
import { userHomes } from '../home/models/UserHome';
import { contractors } from '../contractor/models/Contractor';
import { jobs } from '../job/models/Job';
import { TradeCategory, JobIntent } from '@thms/shared';

async function seed() {
  console.log('Seeding database...');

  const now = new Date();
  const passwordHash = await bcrypt.hash('password123', 12);

  // ── Users ─────────────────────────────────────────────────────────────────────

  // User 1: two homes (the main homeowner demo)
  const user1Id = createId();
  await db.insert(users).values({
    id: user1Id, email: 'demo@thms.dev', passwordHash,
    firstName: 'Demo', lastName: 'User', role: 'USER', updatedAt: now,
  }).onConflictDoNothing();

  // User 2: no homes
  const user2Id = createId();
  await db.insert(users).values({
    id: user2Id, email: 'nohomes@thms.dev', passwordHash,
    firstName: 'No', lastName: 'Homes', role: 'USER', updatedAt: now,
  }).onConflictDoNothing();

  // User 3: admin
  const adminId = createId();
  await db.insert(users).values({
    id: adminId, email: 'admin@thms.dev', passwordHash,
    firstName: 'Admin', lastName: 'User', role: 'ADMIN', updatedAt: now,
  }).onConflictDoNothing();

  // ── Homes (user1 only) ────────────────────────────────────────────────────
  const home1Id = createId();
  const home2Id = createId();

  await db.insert(homes).values([
    {
      id: home1Id, name: 'Main Residence', address1: '123 Maple Street',
      city: 'Austin', state: 'TX', zipCode: '78701', country: 'US', updatedAt: now,
    },
    {
      id: home2Id, name: 'Rental Unit', address1: '456 Oak Avenue', address2: 'Unit 2B',
      city: 'Austin', state: 'TX', zipCode: '78702', country: 'US', updatedAt: now,
    },
  ]).onConflictDoNothing();

  await db.insert(userHomes).values([
    { userId: user1Id, homeId: home1Id, role: 'OWNER' },
    { userId: user1Id, homeId: home2Id, role: 'OWNER' },
  ]).onConflictDoNothing();

  // ── Contractors (global) ──────────────────────────────────────────────────
  const contractorData: { category: TradeCategory; name: string; companyName: string; email: string; phone: string }[] = [
    { category: TradeCategory.PLUMBING,            name: 'Mike Torres',    companyName: 'Torres Plumbing',         email: 'mike@torresplumbing.com',    phone: '5125550101' },
    { category: TradeCategory.ELECTRICAL,          name: 'Sarah Chen',     companyName: 'Chen Electric',           email: 'sarah@chenelectric.com',     phone: '5125550102' },
    { category: TradeCategory.HVAC,                name: 'David Park',     companyName: 'Park Heating & Cooling',  email: 'david@parkhvac.com',         phone: '5125550103' },
    { category: TradeCategory.ROOFING,             name: 'James Williams', companyName: 'Williams Roofing Co.',    email: 'james@williamsroofing.com',  phone: '5125550104' },
    { category: TradeCategory.PAINTING,            name: 'Ana Reyes',      companyName: 'Reyes Painting',          email: 'ana@reyespainting.com',      phone: '5125550105' },
    { category: TradeCategory.LANDSCAPING,         name: 'Tom Green',      companyName: 'Green Thumb Landscaping', email: 'tom@greenthumb.com',         phone: '5125550106' },
    { category: TradeCategory.GENERAL_CONTRACTING, name: 'Lisa Brown',     companyName: 'Brown Build & Renovate',  email: 'lisa@brownbuild.com',        phone: '5125550107' },
    { category: TradeCategory.CARPENTRY,           name: 'Carlos Rivera',  companyName: 'Rivera Woodworks',        email: 'carlos@riverawood.com',      phone: '5125550108' },
    { category: TradeCategory.FLOORING,            name: 'Emma Davis',     companyName: 'Davis Floors',            email: 'emma@davisfloors.com',       phone: '5125550109' },
    { category: TradeCategory.PEST_CONTROL,        name: 'Kevin Nguyen',   companyName: 'Nguyen Pest Solutions',   email: 'kevin@nguyenpest.com',       phone: '5125550110' },
  ];

  for (const c of contractorData) {
    await db.insert(contractors).values({ id: createId(), ...c, updatedAt: now }).onConflictDoNothing();
  }

  // ── Jobs (one per category, all on home1) ────────────────────────────────
  const jobData: { intent: JobIntent; category: TradeCategory; title: string; description: string }[] = [
    { intent: JobIntent.ISSUE,          category: TradeCategory.PLUMBING,            title: 'Fix kitchen sink leak',          description: 'Slow drain and dripping faucet under the kitchen sink.' },
    { intent: JobIntent.ISSUE,          category: TradeCategory.ELECTRICAL,          title: 'Replace outdoor outlets',        description: 'Two outdoor GFCI outlets need replacement; one is not functioning.' },
    { intent: JobIntent.RECURRING_WORK, category: TradeCategory.HVAC,                title: 'Annual AC tune-up',              description: 'Pre-summer inspection and tune-up of central air conditioning unit.' },
    { intent: JobIntent.ISSUE,          category: TradeCategory.ROOFING,             title: 'Repair storm-damaged shingles',  description: 'Several shingles were blown off during the last storm; need inspection and repair.' },
    { intent: JobIntent.IMPROVEMENT,    category: TradeCategory.PAINTING,            title: 'Interior living room repaint',   description: 'Paint living room and hallway — approx 400 sq ft, walls only.' },
    { intent: JobIntent.RECURRING_WORK, category: TradeCategory.LANDSCAPING,         title: 'Spring yard cleanup',            description: 'Trim hedges, clear flower beds, and aerate the back lawn.' },
    { intent: JobIntent.IMPROVEMENT,    category: TradeCategory.GENERAL_CONTRACTING, title: 'Kitchen cabinet refresh',        description: 'Replace cabinet doors and hardware in the kitchen.' },
    { intent: JobIntent.IMPROVEMENT,    category: TradeCategory.CARPENTRY,           title: 'Build backyard deck',            description: 'New 12x16 ft cedar deck off the back door.' },
    { intent: JobIntent.IMPROVEMENT,    category: TradeCategory.FLOORING,            title: 'Replace master bedroom carpet',  description: 'Remove old carpet and install hardwood flooring in master bedroom (~200 sq ft).' },
    { intent: JobIntent.ISSUE,          category: TradeCategory.PEST_CONTROL,        title: 'Ant and termite inspection',     description: 'Noticed ant trails along the foundation; need inspection and treatment.' },
  ];

  for (const j of jobData) {
    await db.insert(jobs).values({
      id: createId(), homeId: home1Id, title: j.title, intent: j.intent, category: j.category,
      description: j.description, status: 'DRAFT', createdByUserId: user1Id, updatedAt: now,
    }).onConflictDoNothing();
  }

  console.log('Done.');
  console.log('  demo@thms.dev     / password123  (USER  — 2 homes, 10 jobs)');
  console.log('  nohomes@thms.dev  / password123  (USER  — no homes)');
  console.log('  admin@thms.dev    / password123  (ADMIN — sees all, manages contractors)');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
