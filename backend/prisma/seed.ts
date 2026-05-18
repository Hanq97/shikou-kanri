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

type ScheduleSeedStatus =
  | 'pending'
  | 'notified'
  | 'overdue'
  | 'completed'
  | 'cancelled';

function addYears(base: Date, years: number): Date {
  const d = new Date(base);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

function deriveStatus(scheduledDate: Date, today: Date): ScheduleSeedStatus {
  const diffDays = Math.floor(
    (scheduledDate.getTime() - today.getTime()) / 86_400_000,
  );
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 14) return 'notified';
  return 'pending';
}

async function seedF6(prisma: PrismaClient): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding F6 aftercare sample data...');

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
    console.log('  ⚠️  Required users missing; skipping F6 seed');
    return;
  }

  if ((await prisma.maintenanceSchedule.count()) > 0) {
    // eslint-disable-next-line no-console
    console.log('  ↩  F6 sample data already exists, skipping');
    return;
  }

  // 7 additional customers — realistic Japanese names, Tokyo wards
  const customersData = [
    {
      name: '佐藤 健一',
      nameKana: 'サトウ ケンイチ',
      phone: '09011112233',
      email: 'sato.kenichi@example.com',
      address: '東京都新宿区西新宿8-1-1',
      isOb: true,
      acquiredAt: new Date('2024-05-30'),
      notes: '新築引渡し済（昨年）',
    },
    {
      name: '鈴木 美香',
      nameKana: 'スズキ ミカ',
      phone: '08022223344',
      email: 'suzuki.mika@example.com',
      address: '東京都渋谷区代々木3-2-1',
      isOb: true,
      acquiredAt: new Date('2023-11-30'),
      notes: '点検時期に苦情あり',
    },
    {
      name: '高橋 浩二',
      nameKana: 'タカハシ コウジ',
      phone: '09033334455',
      email: 'takahashi@example.com',
      address: '東京都港区赤坂6-1-5',
      isOb: true,
      acquiredAt: new Date('2017-07-20'),
      notes: '物件2件（自宅+投資用）',
    },
    {
      name: '渡辺 千恵',
      nameKana: 'ワタナベ チエ',
      phone: '08044445566',
      email: 'watanabe.chie@example.com',
      address: '東京都世田谷区下北沢2-10-3',
      isOb: true,
      acquiredAt: new Date('2014-04-01'),
      notes: '10年点検対象',
    },
    {
      name: '伊藤 良太',
      nameKana: 'イトウ リョウタ',
      phone: '09055556677',
      email: 'ito.ryota@example.com',
      address: '東京都杉並区高円寺南5-3-2',
      isOb: true,
      acquiredAt: new Date('2022-10-01'),
      notes: '兄弟で2件購入',
    },
    {
      name: '山本 由美',
      nameKana: 'ヤマモト ユミ',
      phone: '08066667788',
      email: 'yamamoto.yumi@example.com',
      address: '東京都目黒区自由が丘1-15-7',
      isOb: true,
      acquiredAt: new Date('2025-12-01'),
      notes: '新規引渡し（今年末予定）',
    },
    {
      name: '中村 正樹',
      nameKana: 'ナカムラ マサキ',
      phone: '09077778899',
      email: 'nakamura.masaki@example.com',
      address: '東京都品川区五反田4-8-1',
      isOb: true,
      acquiredAt: new Date('2016-09-15'),
      notes: 'リフォーム要望多め',
    },
  ];

  const newCustomers = [];
  for (const c of customersData) {
    const created = await prisma.customer.create({
      data: {
        customerType: 'individual',
        ...c,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    newCustomers.push(created);
  }
  const [sato, suzuki, takahashi, watanabe, ito, yamamoto, nakamura] =
    newCustomers;

  // Find existing F1 customers to extend with more properties
  const yamada = await prisma.customer.findFirst({
    where: { name: '山田 太郎', deletedAt: null },
  });
  const towaTrading = await prisma.customer.findFirst({
    where: { name: '株式会社 藤和商事', deletedAt: null },
  });

  // 11 new properties — varied wards + handover dates spanning 2014–2025
  type PropSeed = {
    customerId: string;
    address: string;
    propertyType:
      | 'new_construction'
      | 'remodel'
      | 'single_family'
      | 'multi_family'
      | 'commercial'
      | 'other';
    structure: 'wood' | 'steel' | 'rc' | 'other';
    yearBuilt: number;
    handoverDate: Date;
    floorAreaSqm: number;
    notes: string;
  };
  const propertiesData: PropSeed[] = [
    {
      customerId: sato.id,
      address: '東京都新宿区西新宿8-1-1',
      propertyType: 'single_family',
      structure: 'wood',
      yearBuilt: 2025,
      handoverDate: new Date('2025-05-30'),
      floorAreaSqm: 105.0,
      notes: '新築木造2階建て',
    },
    {
      customerId: suzuki.id,
      address: '東京都渋谷区代々木3-2-1',
      propertyType: 'single_family',
      structure: 'wood',
      yearBuilt: 2024,
      handoverDate: new Date('2024-12-01'),
      floorAreaSqm: 88.5,
      notes: '1年点検時期超過',
    },
    {
      customerId: takahashi.id,
      address: '東京都港区赤坂6-1-5',
      propertyType: 'single_family',
      structure: 'wood',
      yearBuilt: 2017,
      handoverDate: new Date('2017-08-15'),
      floorAreaSqm: 142.0,
      notes: '自宅、定期点検中',
    },
    {
      customerId: takahashi.id,
      address: '東京都中央区銀座7-12-4',
      propertyType: 'multi_family',
      structure: 'rc',
      yearBuilt: 2021,
      handoverDate: new Date('2021-06-10'),
      floorAreaSqm: 65.0,
      notes: '投資用マンション',
    },
    {
      customerId: watanabe.id,
      address: '東京都世田谷区下北沢2-10-3',
      propertyType: 'single_family',
      structure: 'wood',
      yearBuilt: 2014,
      handoverDate: new Date('2014-04-15'),
      floorAreaSqm: 110.0,
      notes: '10年点検必要',
    },
    {
      customerId: ito.id,
      address: '東京都杉並区高円寺南5-3-2',
      propertyType: 'single_family',
      structure: 'wood',
      yearBuilt: 2022,
      handoverDate: new Date('2022-11-20'),
      floorAreaSqm: 95.0,
      notes: '兄弟物件1',
    },
    {
      customerId: ito.id,
      address: '東京都杉並区荻窪4-2-8',
      propertyType: 'single_family',
      structure: 'wood',
      yearBuilt: 2023,
      handoverDate: new Date('2023-08-01'),
      floorAreaSqm: 92.5,
      notes: '兄弟物件2',
    },
    {
      customerId: yamamoto.id,
      address: '東京都目黒区自由が丘1-15-7',
      propertyType: 'single_family',
      structure: 'wood',
      yearBuilt: 2025,
      handoverDate: new Date('2025-12-15'),
      floorAreaSqm: 118.0,
      notes: '年末引渡し予定',
    },
    {
      customerId: nakamura.id,
      address: '東京都品川区五反田4-8-1',
      propertyType: 'single_family',
      structure: 'steel',
      yearBuilt: 2016,
      handoverDate: new Date('2016-09-30'),
      floorAreaSqm: 130.0,
      notes: '鉄骨造、リフォーム実績あり',
    },
  ];
  if (yamada) {
    propertiesData.push({
      customerId: yamada.id,
      address: '東京都新宿区西新宿1-1-2',
      propertyType: 'multi_family',
      structure: 'rc',
      yearBuilt: 2020,
      handoverDate: new Date('2020-04-01'),
      floorAreaSqm: 80.0,
      notes: '山田様セカンドハウス',
    });
  }
  if (towaTrading) {
    propertiesData.push({
      customerId: towaTrading.id,
      address: '東京都港区六本木5-5-5',
      propertyType: 'commercial',
      structure: 'rc',
      yearBuilt: 2018,
      handoverDate: new Date('2018-03-15'),
      floorAreaSqm: 380.0,
      notes: '藤和商事 六本木支店',
    });
  }

  const newProperties = [];
  for (const p of propertiesData) {
    const created = await prisma.property.create({
      data: {
        ...p,
        photoUrls: [],
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    newProperties.push(created);
  }

  // Generate 4 schedules per property with handoverDate (incl F1 props)
  const propsWithHandover = await prisma.property.findMany({
    where: { handoverDate: { not: null }, deletedAt: null },
    select: { id: true, handoverDate: true, address: true },
  });

  const TODAY = new Date('2026-05-19');
  const MILESTONES: Array<{
    type: 'one_year' | 'three_year' | 'five_year' | 'ten_year';
    years: number;
  }> = [
    { type: 'one_year', years: 1 },
    { type: 'three_year', years: 3 },
    { type: 'five_year', years: 5 },
    { type: 'ten_year', years: 10 },
  ];
  let schedulesCreated = 0;
  for (const prop of propsWithHandover) {
    if (!prop.handoverDate) continue;
    for (const m of MILESTONES) {
      const scheduledDate = addYears(prop.handoverDate, m.years);
      const status = deriveStatus(scheduledDate, TODAY);
      const notifiedAt =
        status === 'notified' || status === 'overdue'
          ? new Date(scheduledDate.getTime() - 14 * 86_400_000)
          : null;
      await prisma.maintenanceSchedule.create({
        data: {
          propertyId: prop.id,
          scheduleType: m.type,
          scheduledDate,
          status,
          notifiedAt,
          createdById: admin.id,
          updatedById: admin.id,
        },
      });
      schedulesCreated++;
    }
  }

  // Mark a few past 'overdue' schedules as 'completed' for variety
  const completionTargets = await prisma.maintenanceSchedule.findMany({
    where: {
      status: 'overdue',
      scheduledDate: { lt: new Date('2025-01-01') },
    },
    take: 4,
    orderBy: { scheduledDate: 'asc' },
    include: { property: { include: { customer: true } } },
  });

  // Aftercare records: 10 mixed types/statuses
  const records: Array<{
    customerId: string;
    propertyId: string | null;
    scheduleId: string | null;
    recordType: 'inspection' | 'repair' | 'inquiry' | 'complaint' | 'other';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    occurredAt: Date;
    title: string;
    description: string;
    handledById: string;
    resolvedAt: Date | null;
    resolutionNotes: string | null;
  }> = [];

  for (const sch of completionTargets) {
    records.push({
      customerId: sch.property.customer.id,
      propertyId: sch.property.id,
      scheduleId: sch.id,
      recordType: 'inspection',
      status: 'closed',
      occurredAt: sch.scheduledDate,
      title: `定期点検実施 (${sch.scheduleType})`,
      description: '担当者訪問の上、外壁・屋根・配管を点検。異常なし。',
      handledById: employee.id,
      resolvedAt: new Date(sch.scheduledDate.getTime() + 7 * 86_400_000),
      resolutionNotes: '点検完了、報告書送付済み',
    });
  }

  // Additional standalone records — repair/inquiry/complaint
  const ito1Prop = newProperties.find((p) => p.customerId === ito.id);
  if (ito1Prop) {
    records.push({
      customerId: ito.id,
      propertyId: ito1Prop.id,
      scheduleId: null,
      recordType: 'repair',
      status: 'in_progress',
      occurredAt: new Date('2026-05-10'),
      title: '雨漏り修理依頼',
      description: '寝室天井に雨染みが発生。早急対応希望。',
      handledById: employee.id,
      resolvedAt: null,
      resolutionNotes: null,
    });
  }
  const suzukiProp = newProperties.find((p) => p.customerId === suzuki.id);
  if (suzukiProp) {
    records.push({
      customerId: suzuki.id,
      propertyId: suzukiProp.id,
      scheduleId: null,
      recordType: 'complaint',
      status: 'open',
      occurredAt: new Date('2026-05-15'),
      title: '1年点検の連絡なし',
      description: '昨年12月引渡しから1年点検の案内がなく、不安を感じている。',
      handledById: manager.id,
      resolvedAt: null,
      resolutionNotes: null,
    });
  }
  records.push({
    customerId: takahashi.id,
    propertyId: null,
    scheduleId: null,
    recordType: 'inquiry',
    status: 'resolved',
    occurredAt: new Date('2026-04-22'),
    title: '増築の見積依頼',
    description: '自宅2階に1部屋追加できないか相談。',
    handledById: manager.id,
    resolvedAt: new Date('2026-05-02'),
    resolutionNotes: '現地調査済み、見積提示済',
  });
  if (yamada) {
    records.push({
      customerId: yamada.id,
      propertyId: null,
      scheduleId: null,
      recordType: 'inquiry',
      status: 'closed',
      occurredAt: new Date('2025-11-08'),
      title: 'エアコン交換の相談',
      description: 'リビングのエアコン故障、推奨機種の問い合わせ',
      handledById: employee.id,
      resolvedAt: new Date('2025-11-15'),
      resolutionNotes: '推奨機種紹介、業者手配済',
    });
  }
  records.push({
    customerId: nakamura.id,
    propertyId: null,
    scheduleId: null,
    recordType: 'other',
    status: 'closed',
    occurredAt: new Date('2025-09-01'),
    title: '駐車場拡張工事の相談',
    description: '隣地購入に伴う駐車場拡張、可能性ヒアリング',
    handledById: manager.id,
    resolvedAt: new Date('2025-09-20'),
    resolutionNotes: '別途プロジェクト化、F1で管理中',
  });

  for (const r of records) {
    const created = await prisma.aftercareRecord.create({
      data: {
        ...r,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    // Link back: if record completes a schedule, update schedule
    if (r.scheduleId) {
      await prisma.maintenanceSchedule.update({
        where: { id: r.scheduleId },
        data: {
          status: 'completed',
          completedAt: r.resolvedAt ?? new Date(),
          completedRecordId: created.id,
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `  ✓  F6 sample: 7 customers, ${propertiesData.length} properties, ${schedulesCreated} schedules, ${records.length} aftercare records`,
  );
}

async function seedW3(prisma: PrismaClient): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding W3 chat + notifications sample data...');

  const admin = await prisma.user.findUnique({
    where: { email: 'admin@dev.shikou-kanri.local' },
  });
  const employee = await prisma.user.findUnique({
    where: { email: 'employee@dev.shikou-kanri.local' },
  });
  if (!admin || !employee) {
    // eslint-disable-next-line no-console
    console.log('  ⚠️  Required users missing; skipping W3 seed');
    return;
  }

  if ((await prisma.chatMessage.count()) > 0) {
    // eslint-disable-next-line no-console
    console.log('  ↩  W3 sample chat already exists, skipping');
    return;
  }

  const project = await prisma.project.findFirst({
    where: { name: '田中様邸 キッチンリフォーム', deletedAt: null },
  });
  if (!project) {
    // eslint-disable-next-line no-console
    console.log('  ⚠️  Demo project missing; skipping W3 chat seed');
    return;
  }

  const messages = [
    {
      author: employee,
      body: 'お疲れさまです。田中様邸キッチンの現地調査完了しました。',
      offsetMin: 60 * 24 * 5,
    },
    {
      author: admin,
      body: 'ありがとうございます。寸法はいかがでしたか?',
      offsetMin: 60 * 24 * 4,
    },
    {
      author: employee,
      body: '幅2400mm、奥行600mmです。L字配置で問題なさそうです。',
      offsetMin: 60 * 24 * 4 - 30,
    },
    {
      author: admin,
      body: 'OKです。見積に反映お願いします。納期は2週間後を目処に。',
      offsetMin: 60 * 24 * 3,
    },
    {
      author: employee,
      body: '了解しました。今週中に見積出します。',
      offsetMin: 60 * 24 * 3 - 60,
    },
    {
      author: employee,
      body: '見積完成しました。承認お願いします。',
      offsetMin: 60 * 24 * 1,
    },
    { author: admin, body: '確認しました。承認します。', offsetMin: 60 * 6 },
    {
      author: employee,
      body: '承認ありがとうございます!着工準備します。',
      offsetMin: 60 * 2,
    },
  ];

  const now = Date.now();
  const createdMessages = [];
  for (const m of messages) {
    const msg = await prisma.chatMessage.create({
      data: {
        projectId: project.id,
        authorId: m.author.id,
        body: m.body,
        createdAt: new Date(now - m.offsetMin * 60_000),
        updatedAt: new Date(now - m.offsetMin * 60_000),
      },
    });
    createdMessages.push(msg);
  }

  // Admin already read the first 6, employee read all
  for (let i = 0; i < createdMessages.length; i++) {
    const msg = createdMessages[i];
    // employee reads all of their own + admin replies up to last
    if (i < createdMessages.length) {
      await prisma.chatMessageRead.upsert({
        where: {
          messageId_userId: { messageId: msg.id, userId: employee.id },
        },
        create: {
          messageId: msg.id,
          userId: employee.id,
          readAt: new Date(now - 60 * 60_000),
        },
        update: {},
      });
    }
    // admin only read first 6 (last 2 still unread)
    if (i < 6) {
      await prisma.chatMessageRead.upsert({
        where: {
          messageId_userId: { messageId: msg.id, userId: admin.id },
        },
        create: {
          messageId: msg.id,
          userId: admin.id,
          readAt: new Date(now - 4 * 60 * 60_000),
        },
        update: {},
      });
    }
  }

  // Notifications for admin
  const notifData = [
    {
      kind: 'chat_new_message' as const,
      title: '新しいメッセージ - 田中様邸 キッチンリフォーム',
      body: '営業一郎: 承認ありがとうございます!着工準備します。',
      link: `/projects/${project.id}`,
      offsetMin: 60 * 2,
      readAt: null,
    },
    {
      kind: 'aftercare_due' as const,
      title: '【1年点検】まもなく予定日',
      body: '佐藤 健一様 - 2026-05-30 (あと11日)',
      link: '/aftercare/schedules',
      offsetMin: 60 * 24,
      readAt: null,
    },
    {
      kind: 'quote_approval_request' as const,
      title: '見積承認依頼',
      body: 'Q-2026-0001 田中様邸 キッチンリフォーム ¥1,500,000',
      link: '/estimates',
      offsetMin: 60 * 24 * 2,
      readAt: new Date(now - 60 * 60 * 60_000),
    },
    {
      kind: 'project_member_added' as const,
      title: '案件メンバーに追加されました',
      body: '藤和商事本社 外壁修繕',
      link: '/projects',
      offsetMin: 60 * 24 * 3,
      readAt: new Date(now - 2 * 24 * 60 * 60_000),
    },
    {
      kind: 'other' as const,
      title: 'システムメンテナンスのお知らせ',
      body: '2026-06-01 02:00-04:00 (JST)',
      link: null,
      offsetMin: 60 * 24 * 5,
      readAt: new Date(now - 4 * 24 * 60 * 60_000),
    },
  ];

  for (const n of notifData) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        link: n.link,
        readAt: n.readAt,
        createdAt: new Date(now - n.offsetMin * 60_000),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `  ✓  W3 sample: ${createdMessages.length} chat messages, ${notifData.length} notifications`,
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
  await seedF6(prisma);
  await seedW3(prisma);

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
