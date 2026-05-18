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
  {
    // Invited worker (職人) — restricted access to assigned projects only.
    // Used to test FR-MEM-005 invited filter. Assigned to active projects via ensureInvitedMemberships().
    email: 'worker@dev.shikou-kanri.local',
    name: '職人 健一',
    nameKana: 'ショクニン ケンイチ',
    role: 'invited' as const,
  },
];

async function seedF2(prisma: PrismaClient): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding F2 unit_prices sample data...');

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@dev.shikou-kanri.local' },
  });
  if (!admin) {
    // eslint-disable-next-line no-console
    console.log('  ⚠️  Admin user missing; skipping F2 seed');
    return;
  }

  if ((await prisma.unitPrice.count()) > 0) {
    // eslint-disable-next-line no-console
    console.log('  ↩  F2 unit_prices already exists, skipping');
    return;
  }

  const samples: Array<{
    code: string;
    category: string;
    itemName: string;
    description?: string;
    unit: string;
    defaultUnitPrice: number;
    supplierName?: string;
  }> = [
    // 解体工事 (Demolition)
    {
      code: 'DML-001',
      category: '解体工事',
      itemName: '内装解体',
      unit: 'm²',
      defaultUnitPrice: 5000,
    },
    {
      code: 'DML-002',
      category: '解体工事',
      itemName: '木造家屋解体',
      unit: '坪',
      defaultUnitPrice: 30000,
    },
    {
      code: 'DML-003',
      category: '解体工事',
      itemName: 'RC造解体',
      unit: '坪',
      defaultUnitPrice: 50000,
    },
    {
      code: 'DML-004',
      category: '解体工事',
      itemName: '産業廃棄物処分費',
      unit: 'm³',
      defaultUnitPrice: 15000,
    },

    // 基礎工事 (Foundation)
    {
      code: 'FND-001',
      category: '基礎工事',
      itemName: 'べた基礎',
      unit: 'm²',
      defaultUnitPrice: 18000,
    },
    {
      code: 'FND-002',
      category: '基礎工事',
      itemName: '布基礎',
      unit: 'm²',
      defaultUnitPrice: 15000,
    },
    {
      code: 'FND-003',
      category: '基礎工事',
      itemName: '地盤改良',
      unit: 'm²',
      defaultUnitPrice: 12000,
    },

    // 木工事 (Carpentry)
    {
      code: 'WD-001',
      category: '木工事',
      itemName: 'フローリング張替',
      unit: 'm²',
      defaultUnitPrice: 8000,
    },
    {
      code: 'WD-002',
      category: '木工事',
      itemName: '畳張替 (い草)',
      unit: '畳',
      defaultUnitPrice: 15000,
    },
    {
      code: 'WD-003',
      category: '木工事',
      itemName: '木造軸組',
      unit: 'm²',
      defaultUnitPrice: 25000,
    },
    {
      code: 'WD-004',
      category: '木工事',
      itemName: '建具取付',
      unit: '本',
      defaultUnitPrice: 18000,
    },

    // 屋根工事 (Roofing)
    {
      code: 'ROOF-001',
      category: '屋根工事',
      itemName: '瓦交換',
      unit: 'm²',
      defaultUnitPrice: 12000,
    },
    {
      code: 'ROOF-002',
      category: '屋根工事',
      itemName: 'スレート葺き',
      unit: 'm²',
      defaultUnitPrice: 8000,
    },
    {
      code: 'ROOF-003',
      category: '屋根工事',
      itemName: '雨樋交換',
      unit: 'm',
      defaultUnitPrice: 4500,
    },
    {
      code: 'ROOF-004',
      category: '屋根工事',
      itemName: '屋根塗装 (シリコン)',
      unit: 'm²',
      defaultUnitPrice: 3500,
    },

    // 外壁工事 (External wall)
    {
      code: 'EXT-001',
      category: '外壁工事',
      itemName: '外壁塗装 (シリコン)',
      unit: 'm²',
      defaultUnitPrice: 3000,
    },
    {
      code: 'EXT-002',
      category: '外壁工事',
      itemName: '外壁塗装 (フッ素)',
      unit: 'm²',
      defaultUnitPrice: 4500,
    },
    {
      code: 'EXT-003',
      category: '外壁工事',
      itemName: 'サイディング張替',
      unit: 'm²',
      defaultUnitPrice: 6000,
    },
    {
      code: 'EXT-004',
      category: '外壁工事',
      itemName: 'コーキング打替',
      unit: 'm',
      defaultUnitPrice: 1200,
    },

    // 設備工事 (Equipment)
    {
      code: 'KCH-001',
      category: '設備工事',
      itemName: 'システムキッチン交換',
      unit: '式',
      defaultUnitPrice: 800000,
    },
    {
      code: 'BTH-001',
      category: '設備工事',
      itemName: 'ユニットバス交換',
      unit: '式',
      defaultUnitPrice: 700000,
    },
    {
      code: 'WC-001',
      category: '設備工事',
      itemName: 'トイレ交換',
      unit: '台',
      defaultUnitPrice: 150000,
    },
    {
      code: 'WC-002',
      category: '設備工事',
      itemName: '洗面台交換',
      unit: '台',
      defaultUnitPrice: 80000,
    },
    {
      code: 'PLM-001',
      category: '設備工事',
      itemName: '配管工事 (給排水)',
      unit: 'm',
      defaultUnitPrice: 5000,
    },
    {
      code: 'ELC-001',
      category: '設備工事',
      itemName: '配線工事',
      unit: 'm',
      defaultUnitPrice: 1500,
    },
    {
      code: 'ELC-002',
      category: '設備工事',
      itemName: 'LED照明取付',
      unit: '台',
      defaultUnitPrice: 8000,
    },
    {
      code: 'AC-001',
      category: '設備工事',
      itemName: 'エアコン取付',
      unit: '台',
      defaultUnitPrice: 25000,
    },

    // 仕上工事 (Finishing)
    {
      code: 'CLR-001',
      category: '仕上工事',
      itemName: 'クロス張替',
      unit: 'm²',
      defaultUnitPrice: 1200,
    },
    {
      code: 'CLR-002',
      category: '仕上工事',
      itemName: 'クッションフロア張替',
      unit: 'm²',
      defaultUnitPrice: 3500,
    },
    {
      code: 'PNT-001',
      category: '仕上工事',
      itemName: '内装塗装',
      unit: 'm²',
      defaultUnitPrice: 2500,
    },
    {
      code: 'TIL-001',
      category: '仕上工事',
      itemName: 'タイル張替',
      unit: 'm²',
      defaultUnitPrice: 8000,
    },

    // 諸経費 (Misc)
    {
      code: 'SCF-001',
      category: '諸経費',
      itemName: '足場設置・解体',
      unit: '式',
      defaultUnitPrice: 80000,
    },
    {
      code: 'SCF-002',
      category: '諸経費',
      itemName: '養生シート',
      unit: '式',
      defaultUnitPrice: 25000,
    },
    {
      code: 'MGT-001',
      category: '諸経費',
      itemName: '現場管理費',
      unit: '式',
      defaultUnitPrice: 50000,
    },
    {
      code: 'TRP-001',
      category: '諸経費',
      itemName: '運搬費',
      unit: '回',
      defaultUnitPrice: 15000,
    },
    {
      code: 'CLN-001',
      category: '諸経費',
      itemName: '清掃費',
      unit: '式',
      defaultUnitPrice: 20000,
    },
  ];

  for (const sample of samples) {
    await prisma.unitPrice.create({
      data: {
        ...sample,
        isActive: true,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`  ✓  F2 seeded ${samples.length} unit_prices`);
}

async function ensureInvitedMemberships(prisma: PrismaClient): Promise<void> {
  const worker = await prisma.user.findUnique({
    where: { email: 'worker@dev.shikou-kanri.local' },
  });
  if (!worker) return;

  // Assign worker as invited_worker on 2 active projects so they have something to see.
  const targets = await prisma.project.findMany({
    where: {
      name: { in: ['田中様邸 キッチンリフォーム', '藤和商事本社 外壁修繕'] },
      deletedAt: null,
    },
    select: { id: true, name: true },
  });

  for (const p of targets) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: p.id, userId: worker.id } },
      create: {
        projectId: p.id,
        userId: worker.id,
        roleOnProject: 'invited_worker',
      },
      update: { revokedAt: null, roleOnProject: 'invited_worker' },
    });
    // eslint-disable-next-line no-console
    console.log(`  ✓  Worker assigned to: ${p.name}`);
  }
}

async function seedF1(prisma: PrismaClient): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding F1 sample data...');

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@dev.shikou-kanri.local' },
  });
  const manager = await prisma.user.findUnique({
    where: { email: 'manager@dev.shikou-kanri.local' },
  });
  const employee = await prisma.user.findUnique({
    where: { email: 'employee@dev.shikou-kanri.local' },
  });
  if (!admin || !manager || !employee) {
    // eslint-disable-next-line no-console
    console.log('  ⚠️  Required users missing; skipping F1 seed');
    return;
  }

  if ((await prisma.customer.count()) > 0) {
    // eslint-disable-next-line no-console
    console.log('  ↩  F1 sample data already exists, skipping');
    return;
  }

  // Customers (3)
  const yamada = await prisma.customer.create({
    data: {
      customerType: 'individual',
      name: '山田 太郎',
      nameKana: 'ヤマダ タロウ',
      phone: '0312345678',
      email: 'yamada@example.com',
      address: '東京都新宿区西新宿1-1-1',
      isOb: true,
      acquiredAt: new Date('2018-04-15'),
      notes: 'OB顧客、新築引渡し済',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  const tanaka = await prisma.customer.create({
    data: {
      customerType: 'individual',
      name: '田中 花子',
      nameKana: 'タナカ ハナコ',
      phone: '09011112222',
      address: '東京都渋谷区恵比寿2-2-2',
      isOb: false,
      notes: '新規顧客、初回見積依頼',
      createdById: manager.id,
      updatedById: manager.id,
    },
  });
  const towaTrading = await prisma.customer.create({
    data: {
      customerType: 'corporate',
      name: '株式会社 藤和商事',
      nameKana: 'カブシキガイシャ トウワショウジ',
      phone: '0335556666',
      email: 'contact@towa-trading.example.com',
      address: '東京都港区赤坂3-3-3',
      isOb: true,
      acquiredAt: new Date('2015-09-01'),
      notes: '法人OB、複数物件あり',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  // Properties (4)
  const yamadaHouse = await prisma.property.create({
    data: {
      customerId: yamada.id,
      address: '東京都新宿区西新宿1-1-1',
      propertyType: 'single_family',
      structure: 'wood',
      yearBuilt: 2018,
      handoverDate: new Date('2018-08-20'),
      floorAreaSqm: 120.5,
      photoUrls: [],
      notes: '木造2階建て',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  const tanakaApartment = await prisma.property.create({
    data: {
      customerId: tanaka.id,
      address: '東京都渋谷区恵比寿2-2-2 #501',
      propertyType: 'multi_family',
      structure: 'rc',
      yearBuilt: 2010,
      floorAreaSqm: 75.0,
      photoUrls: [],
      notes: 'RC造マンション',
      createdById: manager.id,
      updatedById: manager.id,
    },
  });
  const towaOffice = await prisma.property.create({
    data: {
      customerId: towaTrading.id,
      address: '東京都港区赤坂3-3-3',
      propertyType: 'commercial',
      structure: 'steel',
      yearBuilt: 2015,
      handoverDate: new Date('2015-09-01'),
      floorAreaSqm: 450.0,
      photoUrls: [],
      notes: '本社オフィス',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  const towaWarehouse = await prisma.property.create({
    data: {
      customerId: towaTrading.id,
      address: '神奈川県川崎市川崎区5-5-5',
      propertyType: 'commercial',
      structure: 'steel',
      yearBuilt: 2020,
      handoverDate: new Date('2020-03-10'),
      floorAreaSqm: 1200.0,
      photoUrls: [],
      notes: '倉庫',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  // Helper to gen project_code via DB sequence
  async function nextProjectCode(year: number): Promise<string> {
    await prisma.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS project_code_seq_${year} START 1`,
    );
    const result = await prisma.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('project_code_seq_${year}') AS nextval`,
    );
    return `${year}-${String(result[0].nextval).padStart(4, '0')}`;
  }

  const folderTypes: Array<{
    name: string;
    type:
      | 'document'
      | 'drawing'
      | 'schedule'
      | 'photo'
      | 'chalkboard'
      | 'inspection';
  }> = [
    { name: '文書', type: 'document' },
    { name: '図面', type: 'drawing' },
    { name: '工程', type: 'schedule' },
    { name: '写真', type: 'photo' },
    { name: '黒板', type: 'chalkboard' },
    { name: '検査', type: 'inspection' },
  ];

  async function createProjectWithDeps(args: {
    customerId: string;
    propertyId: string | null;
    projectType: 'new_construction' | 'remodel' | 'repair' | 'aftercare';
    status:
      | 'quoting'
      | 'received'
      | 'construction'
      | 'completed'
      | 'handed_over'
      | 'cancelled';
    name: string;
    ownerUserId: string;
    scheduleStart?: Date;
    scheduleEnd?: Date;
    actualStart?: Date;
    actualEnd?: Date;
    amountTotal?: number;
    members: Array<{
      userId: string;
      role: 'owner' | 'contributor' | 'inspector' | 'invited_worker';
    }>;
  }): Promise<void> {
    const projectCode = await nextProjectCode(2026);
    const project = await prisma.project.create({
      data: {
        projectCode,
        customerId: args.customerId,
        propertyId: args.propertyId,
        projectType: args.projectType,
        status: args.status,
        name: args.name,
        ownerUserId: args.ownerUserId,
        scheduleStart: args.scheduleStart,
        scheduleEnd: args.scheduleEnd,
        actualStart: args.actualStart,
        actualEnd: args.actualEnd,
        amountTotal: args.amountTotal,
        createdById: args.ownerUserId,
        updatedById: args.ownerUserId,
      },
    });
    // 6 default folders
    await prisma.folder.createMany({
      data: folderTypes.map((f) => ({
        projectId: project.id,
        name: f.name,
        folderType: f.type,
        isPublicForInvited: false,
      })),
    });
    // Members (incl owner)
    await prisma.projectMember.createMany({
      data: args.members.map((m) => ({
        projectId: project.id,
        userId: m.userId,
        roleOnProject: m.role,
      })),
    });
  }

  // Projects (6 across statuses)
  await createProjectWithDeps({
    customerId: yamada.id,
    propertyId: yamadaHouse.id,
    projectType: 'remodel',
    status: 'quoting',
    name: '山田様邸 浴室リフォーム',
    ownerUserId: employee.id,
    scheduleStart: new Date('2026-06-01'),
    scheduleEnd: new Date('2026-06-30'),
    members: [{ userId: employee.id, role: 'owner' }],
  });
  await createProjectWithDeps({
    customerId: tanaka.id,
    propertyId: tanakaApartment.id,
    projectType: 'remodel',
    status: 'received',
    name: '田中様邸 キッチンリフォーム',
    ownerUserId: employee.id,
    scheduleStart: new Date('2026-05-20'),
    scheduleEnd: new Date('2026-06-15'),
    amountTotal: 1500000,
    members: [
      { userId: employee.id, role: 'owner' },
      { userId: manager.id, role: 'contributor' },
    ],
  });
  await createProjectWithDeps({
    customerId: towaTrading.id,
    propertyId: towaOffice.id,
    projectType: 'repair',
    status: 'construction',
    name: '藤和商事本社 外壁修繕',
    ownerUserId: manager.id,
    scheduleStart: new Date('2026-04-01'),
    scheduleEnd: new Date('2026-05-31'),
    actualStart: new Date('2026-04-05'),
    amountTotal: 3500000,
    members: [{ userId: manager.id, role: 'owner' }],
  });
  await createProjectWithDeps({
    customerId: yamada.id,
    propertyId: yamadaHouse.id,
    projectType: 'aftercare',
    status: 'completed',
    name: '山田様邸 5年点検',
    ownerUserId: employee.id,
    scheduleStart: new Date('2023-08-15'),
    scheduleEnd: new Date('2023-08-16'),
    actualStart: new Date('2023-08-15'),
    actualEnd: new Date('2023-08-16'),
    amountTotal: 50000,
    members: [{ userId: employee.id, role: 'owner' }],
  });
  await createProjectWithDeps({
    customerId: towaTrading.id,
    propertyId: towaWarehouse.id,
    projectType: 'new_construction',
    status: 'handed_over',
    name: '藤和商事 川崎倉庫 新築',
    ownerUserId: manager.id,
    scheduleStart: new Date('2019-06-01'),
    scheduleEnd: new Date('2020-02-28'),
    actualStart: new Date('2019-06-10'),
    actualEnd: new Date('2020-03-05'),
    amountTotal: 250000000,
    members: [
      { userId: manager.id, role: 'owner' },
      { userId: admin.id, role: 'inspector' },
    ],
  });
  await createProjectWithDeps({
    customerId: tanaka.id,
    propertyId: tanakaApartment.id,
    projectType: 'remodel',
    status: 'cancelled',
    name: '田中様邸 浴室リフォーム (キャンセル)',
    ownerUserId: employee.id,
    members: [{ userId: employee.id, role: 'owner' }],
  });

  // eslint-disable-next-line no-console
  console.log(
    '  ✓  F1 sample: 3 customers, 4 properties, 6 projects, 36 folders, 8 members',
  );
}

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

  await seedF1(prisma);
  await ensureInvitedMemberships(prisma);
  await seedF2(prisma);

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
