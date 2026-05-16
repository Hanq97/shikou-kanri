import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.log('🚫 Skipping seed: NODE_ENV=production');
  process.exit(0);
}

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const SEED_PASSWORD = 'DevPassword123!';

const TEST_USERS = [
  {
    email: 'admin@dev.shikou-kanri.local',
    name: '管理者太郎',
    nameKana: 'カンリシャタロウ',
    role: 'system_admin' as const,
  },
  {
    // Backup admin for 2FA emergency recovery — when primary admin loses authenticator app,
    // log in as admin2 → /admin/users → primary admin → 「2FA強制無効化」.
    // Without a 2nd admin, primary admin locked out of 2FA recovery (self-disable is blocked
    // by policy). For prod, use CLI: `pnpm --filter backend cli emergency:disable-2fa <email>`.
    email: 'admin2@dev.shikou-kanri.local',
    name: '管理者次郎',
    nameKana: 'カンリシャジロウ',
    role: 'system_admin' as const,
  },
  {
    email: 'manager@dev.shikou-kanri.local',
    name: '営業マネージャー',
    nameKana: 'エイギョウマネージャー',
    role: 'manager' as const,
  },
  {
    email: 'employee@dev.shikou-kanri.local',
    name: '営業一郎',
    nameKana: 'エイギョウイチロウ',
    role: 'employee' as const,
  },
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const passwordHash = await argon2.hash(SEED_PASSWORD, ARGON2_OPTIONS);

  // eslint-disable-next-line no-console
  console.log('🌱 Seeding dev users...');

  for (const user of TEST_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (existing) {
      // eslint-disable-next-line no-console
      console.log(`  ↩  ${user.email} already exists, skipping`);
      continue;
    }
    await prisma.user.create({
      data: {
        ...user,
        passwordHash,
        status: 'active',
        emailVerified: true,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`  ✓  Created ${user.email} (${user.role})`);
  }

  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log(
    `✅ Seed complete. Password for ALL test users: ${SEED_PASSWORD}`,
  );
  // eslint-disable-next-line no-console
  console.log('   ⚠️  DEV ONLY — never seed prod with hardcoded credentials.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
