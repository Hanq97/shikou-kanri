# F1-CUSTOMER — Backend Detail Design (BDD)

**Feature**: F1 顧客・案件管理
**Version**: BASE — 2026-05-16
**Author**: hanq97
**SRS**: `F1-CUSTOMER-BASE-srs.md`
**BD**: `F1-CUSTOMER-BASE-basic-design.md`

---

## 1. Tổng quan

BDD mô tả implementation chi tiết của backend: NestJS module structure, service pseudo-code, repository methods, error handling, transaction patterns, event emission.

Stack: NestJS 10 + TypeScript strict + Prisma 5 + PostgreSQL 16 + EventEmitter2 + nest-commander (CLI).

---

## 2. Module structure (đã cover ở BD §2, tóm tắt)

```
backend/src/modules/customer/      (NEW)
backend/src/modules/project/       (NEW)
backend/src/modules/auth/          (existing, AuditService upgrade)
backend/src/shared/                (existing)
```

---

## 3. Module wiring

### 3.1 CustomerModule
```ts
@Module({
  imports: [PrismaModule, AuthModule],   // AuthModule export UserRepository for FK validation
  controllers: [
    CustomersController,
    PropertiesController,
    CustomerImportController,
  ],
  providers: [
    CustomersService,
    PropertiesService,
    CustomerImportService,
    CustomerDuplicateCheckService,
    CustomerRepository,
    PropertyRepository,
  ],
  exports: [CustomersService, PropertiesService, CustomerRepository, PropertyRepository],
})
export class CustomerModule {}
```

### 3.2 ProjectModule
```ts
@Module({
  imports: [PrismaModule, AuthModule, CustomerModule, EventEmitterModule.forFeature()],
  controllers: [
    ProjectsController,
    ProjectMembersController,
    SavedSearchesController,
  ],
  providers: [
    ProjectsService,
    ProjectMembersService,
    ProjectStatusMachineService,
    ProjectCodeGeneratorService,
    ProjectFoldersService,
    ProjectExportService,
    SavedSearchesService,
    ProjectRepository,
    ProjectMemberRepository,
    FolderRepository,
    SavedSearchRepository,
  ],
  exports: [ProjectsService],
})
export class ProjectModule {}
```

### 3.3 AppModule update
```ts
imports: [
  // existing F8 modules ...
  CustomerModule,    // NEW
  ProjectModule,     // NEW
]
```

---

## 4. Repositories

### 4.1 CustomerRepository
```ts
@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, includeDeleted = false, tx?: Tx): Promise<Customer | null> {
    const client = tx ?? this.prisma;
    return client.customer.findFirst({
      where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
    });
  }

  async findByPhone(phone: string, tx?: Tx): Promise<Customer | null> {
    const client = tx ?? this.prisma;
    return client.customer.findFirst({
      where: { phone, deletedAt: null },
      orderBy: { createdAt: 'asc' },  // oldest match if multiple
    });
  }

  async list(
    filter: ListCustomersFilter,
    requester: AuthenticatedUser,
    tx?: Tx,
  ): Promise<{ data: Customer[]; total: number }> {
    const client = tx ?? this.prisma;
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(filter.search ? {
        // Combined FTS + trgm
        OR: [
          { searchText: { search: filter.search } },         // tsvector @@ tsquery
          { name: { contains: filter.search, mode: 'insensitive' } },
          { phone: filter.search.replace(/[\s\-()]/g, '') },
        ],
      } : {}),
      ...(filter.isOb !== undefined ? { isOb: filter.isOb } : {}),
    };
    const [data, total] = await Promise.all([
      client.customer.findMany({
        where,
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      client.customer.count({ where }),
    ]);
    return { data, total };
  }

  async create(input: Prisma.CustomerCreateInput, tx?: Tx): Promise<Customer> {
    const client = tx ?? this.prisma;
    return client.customer.create({ data: input });
  }

  async update(id: string, data: Prisma.CustomerUpdateInput, tx?: Tx): Promise<Customer> {
    const client = tx ?? this.prisma;
    return client.customer.update({ where: { id }, data });
  }

  async softDelete(id: string, actorId: string, tx?: Tx): Promise<Customer> {
    const client = tx ?? this.prisma;
    return client.customer.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actorId },
    });
  }
}
```

### 4.2 PropertyRepository — tương tự pattern (CRUD + customer filter)

### 4.3 ProjectRepository
```ts
@Injectable()
export class ProjectRepository {
  // Standard CRUD methods (findById, create, update, softDelete)

  async list(
    filter: ListProjectsFilter,
    requester: AuthenticatedUser,
    tx?: Tx,
  ): Promise<{ data: Project[]; total: number }> {
    const client = tx ?? this.prisma;
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      // Invited_worker restriction
      ...(requester.role === 'invited' ? {
        members: {
          some: { userId: requester.id, revokedAt: null },
        },
      } : {}),
      ...(filter.search ? { searchText: { search: filter.search } } : {}),
      ...(filter.status?.length ? { status: { in: filter.status } } : {}),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.ownerUserId ? { ownerUserId: filter.ownerUserId } : {}),
      ...(filter.projectType?.length ? { projectType: { in: filter.projectType } } : {}),
      ...(filter.from || filter.to ? {
        scheduleStart: {
          ...(filter.from ? { gte: new Date(filter.from) } : {}),
          ...(filter.to ? { lte: new Date(filter.to) } : {}),
        },
      } : {}),
    };
    const [data, total] = await Promise.all([
      client.project.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, nameKana: true } },
          property: { select: { id: true, address: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      client.project.count({ where }),
    ]);
    return { data, total };
  }

  async findByCustomer(customerId: string, tx?: Tx): Promise<Project[]> {
    const client = tx ?? this.prisma;
    return client.project.findMany({
      where: { customerId, deletedAt: null },
      include: {
        property: { select: { id: true, address: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countActiveByCustomer(customerId: string, tx?: Tx): Promise<number> {
    const client = tx ?? this.prisma;
    return client.project.count({
      where: {
        customerId,
        deletedAt: null,
        status: { notIn: ['handed_over', 'cancelled'] },
      },
    });
  }
}
```

### 4.4 ProjectMemberRepository, FolderRepository, SavedSearchRepository — standard CRUD pattern

---

## 5. Services — Implementation pseudo-code

### 5.1 CustomersService

```ts
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: CustomerRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly dupCheck: CustomerDuplicateCheckService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  async list(filter, requester) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();
    return this.repo.list(filter, requester);
  }

  async findById(id, requester) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();
    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundError(id);
    // employee can only view own (created)? per SRS yes for update; view = all allowed
    return customer;
  }

  async create(input, requester, ctx, force = false) {
    const normalizedPhone = normalizePhone(input.phone);
    
    if (!force && normalizedPhone) {
      const dup = await this.dupCheck.checkPhone(normalizedPhone);
      if (dup) {
        return { duplicateOf: { id: dup.id, name: dup.name, address: dup.address } };
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await this.repo.create({
        ...input,
        phone: normalizedPhone,
        createdById: requester.id,
        updatedById: requester.id,
      }, tx);
      await this.audit.logCustomerCreated(customer.id, requester.id, ctx, tx);
      this.events.emit('customer.created', { customerId: customer.id });
      return { customer };
    });
  }

  async update(id, input, requester, ctx, force = false) {
    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundError(id);

    // employee ownership check
    if (requester.role === 'employee' && customer.createdById !== requester.id) {
      throw new AuthInsufficientPermissionError(
        'Bạn chỉ có quyền sửa khách hàng mình tạo',
      );
    }

    const normalizedPhone = input.phone !== undefined ? normalizePhone(input.phone) : undefined;
    
    if (!force && normalizedPhone && normalizedPhone !== customer.phone) {
      const dup = await this.dupCheck.checkPhone(normalizedPhone);
      if (dup && dup.id !== id) {
        return { duplicateOf: { id: dup.id, name: dup.name, address: dup.address } };
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const changed = diffFields(customer, input);
      const updated = await this.repo.update(id, {
        ...input,
        ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
        updatedById: requester.id,
      }, tx);
      await this.audit.logCustomerUpdated(id, changed, requester.id, ctx, tx);
      this.events.emit('customer.updated', { customerId: id, changedFields: Object.keys(changed) });
      return { customer: updated };
    });
  }

  async softDelete(id, requester, ctx) {
    if (requester.role !== 'system_admin') throw new AuthInsufficientPermissionError();
    
    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundError(id);

    // BR-CUS-003: block if active projects
    const activeCount = await this.projectRepo.countActiveByCustomer(id);
    if (activeCount > 0) {
      const projects = await this.prisma.project.findMany({
        where: { customerId: id, deletedAt: null, status: { notIn: ['handed_over', 'cancelled'] } },
        select: { id: true, projectCode: true, name: true, status: true },
      });
      throw new CustomerHasActiveProjectsError(activeCount, projects);
    }

    return this.prisma.$transaction(async (tx) => {
      await this.repo.softDelete(id, requester.id, tx);
      await this.audit.logCustomerDeleted(id, requester.id, ctx, tx);
      this.events.emit('customer.deleted', { customerId: id });
    });
  }

  async findOrCreatePlaceholder(projectCode, requester, ctx, tx): Promise<Customer> {
    const placeholderName = `TBD - 土地仕入れ - ${projectCode}`;
    const placeholderPhone = `TBD-${projectCode}`;
    return this.repo.create({
      customerType: 'individual',
      name: placeholderName,
      phone: placeholderPhone,
      isOb: false,
      createdById: requester.id,
      updatedById: requester.id,
    }, tx);
  }
}
```

**Helper**: `normalizePhone(phone: string)`:
```ts
export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-()　「」]/g, '');
  return cleaned || null;
}
```

### 5.2 PropertiesService
```ts
@Injectable()
export class PropertiesService {
  async create(customerId, input, requester, ctx) {
    // Validate customer exists + permission
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) throw new CustomerNotFoundError(customerId);

    // Validate photo
    this.validatePhotos(input.photoUrls);

    return this.prisma.$transaction(async (tx) => {
      const prop = await this.propRepo.create({
        ...input,
        customerId,
        createdById: requester.id,
      }, tx);
      await this.audit.logPropertyCreated(prop.id, requester.id, ctx, tx);
      if (input.handoverDate) {
        this.events.emit('property.handover_date_set', {
          propertyId: prop.id,
          customerId,
          handoverDate: input.handoverDate,
        });
      }
      return prop;
    });
  }

  async update(id, input, requester, ctx) {
    const existing = await this.propRepo.findById(id);
    if (!existing) throw new PropertyNotFoundError(id);

    this.validatePhotos(input.photoUrls);
    const prevHandover = existing.handoverDate?.getTime();
    const newHandover = input.handoverDate ? new Date(input.handoverDate).getTime() : null;

    return this.prisma.$transaction(async (tx) => {
      const changed = diffFields(existing, input);
      const updated = await this.propRepo.update(id, {
        ...input,
        updatedById: requester.id,
      }, tx);
      await this.audit.logPropertyUpdated(id, changed, requester.id, ctx, tx);

      // Emit handover_date_set if value changed (set or modified)
      if (prevHandover !== newHandover && newHandover) {
        this.events.emit('property.handover_date_set', {
          propertyId: id,
          customerId: existing.customerId,
          handoverDate: input.handoverDate,
        });
      }
      return updated;
    });
  }

  private validatePhotos(photos?: string[]): void {
    if (!photos) return;
    if (photos.length > 3) throw new PropertyPhotoTooManyError();
    for (const p of photos) {
      if (p.length > 150_000) throw new PropertyPhotoTooLargeError();
    }
  }
}
```

### 5.3 CustomerImportService
```ts
@Injectable()
export class CustomerImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: CustomerRepository,
    private readonly audit: AuditService,
  ) {}

  async import(fileBuffer: Buffer, requester, ctx): Promise<ImportResult> {
    const records = await this.parseCsv(fileBuffer);
    const errors: ImportError[] = [];
    const seenPhones = new Set<string>();
    let createdCount = 0;
    let skippedCount = 0;

    // Pre-fetch existing phones to dedup (10K customers max, OK to load)
    const existing = await this.prisma.customer.findMany({
      where: { deletedAt: null, phone: { not: null } },
      select: { phone: true },
    });
    existing.forEach((c) => seenPhones.add(c.phone!));

    return this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          this.validateRow(row, i);
          const phone = normalizePhone(row.phone);
          if (phone && seenPhones.has(phone)) {
            skippedCount++;
            continue;
          }
          await this.repo.create({
            customerType: row.customer_type as CustomerType,
            name: row.name,
            nameKana: row.name_kana || null,
            phone,
            email: row.email || null,
            address: row.address || null,
            isOb: parseBoolean(row.is_ob),
            acquiredAt: row.acquired_at ? new Date(row.acquired_at) : null,
            notes: row.notes || null,
            createdById: requester.id,
            updatedById: requester.id,
          }, tx);
          if (phone) seenPhones.add(phone);
          createdCount++;
        } catch (err) {
          errors.push({ rowIndex: i + 1, message: err.message, raw: row });
        }
      }
      await this.audit.logCustomerCsvImported(
        { created: createdCount, skipped: skippedCount, errorCount: errors.length },
        requester.id,
        ctx,
        tx,
      );
      return { created: createdCount, skipped: skippedCount, errors };
    });
  }

  private parseCsv(buffer: Buffer): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
      const records: CsvRow[] = [];
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      parser.on('data', (row) => records.push(row));
      parser.on('end', () => resolve(records));
      parser.on('error', reject);
      parser.write(buffer);
      parser.end();
    });
  }

  private validateRow(row: CsvRow, idx: number): void {
    if (!row.name || row.name.length > 200) throw new Error('name required, max 200');
    if (!['individual', 'corporate'].includes(row.customer_type)) {
      throw new Error('customer_type must be individual|corporate');
    }
    // ... other validations
  }
}
```

### 5.4 ProjectsService

```ts
@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProjectRepository,
    private readonly customers: CustomersService,
    private readonly codeGen: ProjectCodeGeneratorService,
    private readonly folders: ProjectFoldersService,
    private readonly members: ProjectMemberRepository,
    private readonly users: UserRepository,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  async create(input: CreateProjectInput, requester, ctx) {
    if (requester.role === 'invited') throw new AuthInsufficientPermissionError();

    // Validate owner_user_id role
    const owner = await this.users.findById(input.ownerUserId);
    if (!owner || !['system_admin', 'manager', 'employee'].includes(owner.role)) {
      throw new ProjectInvalidOwnerError();
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve customer
      let customerId = input.customerId;
      const projectCode = await this.codeGen.next(new Date().getFullYear(), tx);

      if (input.preAcquisition) {
        const placeholder = await this.customers.findOrCreatePlaceholder(projectCode, requester, ctx, tx);
        customerId = placeholder.id;
      } else if (!customerId) {
        throw new ProjectCustomerRequiredError();
      }

      // 2. Insert project
      const project = await this.repo.create({
        projectCode,
        customerId,
        propertyId: input.propertyId,
        projectType: input.projectType,
        status: 'quoting',
        name: input.name,
        description: input.description,
        ownerUserId: input.ownerUserId,
        scheduleStart: input.scheduleStart ? new Date(input.scheduleStart) : null,
        scheduleEnd: input.scheduleEnd ? new Date(input.scheduleEnd) : null,
        createdById: requester.id,
        updatedById: requester.id,
      }, tx);

      // 3. Auto-create 6 default folders
      await this.folders.createDefaultFolders(project.id, tx);

      // 4. Insert owner as first member
      await this.members.create({
        projectId: project.id,
        userId: input.ownerUserId,
        roleOnProject: 'owner',
      }, tx);

      // 5. Audit + event
      await this.audit.logProjectCreated(project.id, requester.id, ctx, tx);
      this.events.emit('project.created', {
        projectId: project.id,
        customerId,
        projectType: project.projectType,
      });

      return project;
    });
  }

  async update(id, input, requester, ctx) {
    const project = await this.repo.findById(id);
    if (!project) throw new ProjectNotFoundError(id);

    // Permission: owner OR admin/manager
    const isOwner = project.ownerUserId === requester.id;
    if (!isOwner && !['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    return this.prisma.$transaction(async (tx) => {
      const changed = diffFields(project, input);
      const updated = await this.repo.update(id, {
        ...input,
        updatedById: requester.id,
      }, tx);
      await this.audit.logProjectUpdated(id, changed, requester.id, ctx, tx);
      return updated;
    });
  }

  async softDelete(id, requester, ctx) {
    if (requester.role !== 'system_admin') throw new AuthInsufficientPermissionError();
    const project = await this.repo.findById(id);
    if (!project) throw new ProjectNotFoundError(id);

    return this.prisma.$transaction(async (tx) => {
      await this.repo.softDelete(id, requester.id, tx);
      await this.audit.logProjectDeleted(id, requester.id, ctx, tx);
    });
  }
}
```

### 5.5 ProjectStatusMachineService

```ts
// status-transitions.ts
export const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  quoting:     ['received', 'cancelled'],
  received:    ['construction', 'cancelled'],
  construction:['completed', 'cancelled'],
  completed:   ['handed_over', 'cancelled'],
  handed_over: [],
  cancelled:   [],
};

export const TRANSITIONS_REQUIRING: Record<string, string[]> = {
  'quoting->received': ['amountTotal'],
  'completed->handed_over': ['property.handover_date'],
};

@Injectable()
export class ProjectStatusMachineService {
  async transition(projectId, newStatus, options, requester, ctx) {
    const project = await this.repo.findById(projectId);
    if (!project) throw new ProjectNotFoundError();

    const valid = VALID_TRANSITIONS[project.status]?.includes(newStatus);
    if (!valid) {
      throw new ProjectInvalidStatusTransitionError(project.status, newStatus);
    }

    // Permission check (owner or admin/manager for forward; admin only for cancel-to-active reverse)
    const isOwner = project.ownerUserId === requester.id;
    if (!isOwner && !['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    // Validate required side-effect data
    if (newStatus === 'received' && !project.amountTotal && !options.amountTotal) {
      throw new ProjectMissingFieldForTransitionError('amountTotal');
    }
    if (newStatus === 'handed_over') {
      if (!project.propertyId) throw new ProjectMissingPropertyForHandoverError();
      const property = await this.prisma.property.findUnique({ where: { id: project.propertyId } });
      if (!property?.handoverDate) throw new ProjectMissingHandoverDateError();
    }
    if (newStatus === 'cancelled' && (!options.reason || options.reason.length < 5)) {
      throw new ProjectCancelReasonRequiredError();
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.ProjectUpdateInput = { status: newStatus, updatedById: requester.id };
      if (newStatus === 'received' && options.amountTotal) {
        updateData.amountTotal = options.amountTotal;
      }
      if (newStatus === 'construction' && !project.actualStart) {
        updateData.actualStart = new Date();
      }
      if (newStatus === 'completed' && !project.actualEnd) {
        updateData.actualEnd = new Date();
      }

      const updated = await this.repo.update(projectId, updateData, tx);
      await this.audit.logProjectStatusChanged(
        projectId,
        { from: project.status, to: newStatus, reason: options.reason },
        requester.id,
        ctx,
        tx,
      );
      this.events.emit('project.status_changed', {
        projectId,
        from: project.status,
        to: newStatus,
      });
      return updated;
    });
  }

  async reverseTransition(projectId, newStatus, reason, requester, ctx) {
    if (requester.role !== 'system_admin') throw new AuthInsufficientPermissionError();
    if (!reason || reason.length < 5) throw new ProjectCancelReasonRequiredError();

    const project = await this.repo.findById(projectId);
    if (!project) throw new ProjectNotFoundError();

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.update(projectId, {
        status: newStatus,
        updatedById: requester.id,
      }, tx);
      await this.audit.logProjectStatusReversed(
        projectId,
        { from: project.status, to: newStatus, reason },
        requester.id,
        ctx,
        tx,
      );
      this.events.emit('project.status.reversed', { projectId, from: project.status, to: newStatus });
      return updated;
    });
  }
}
```

### 5.6 ProjectCodeGeneratorService

```ts
@Injectable()
export class ProjectCodeGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns next project_code in `YYYY-NNNN` format, race-safe via DB sequence. */
  async next(year: number, tx?: Tx): Promise<string> {
    const client = tx ?? this.prisma;
    const seqName = `project_code_seq_${year}`;
    // Idempotent sequence creation (no-op if exists)
    await client.$executeRawUnsafe(
      `CREATE SEQUENCE IF NOT EXISTS ${seqName} START 1`,
    );
    const result = await client.$queryRawUnsafe<{ nextval: bigint }[]>(
      `SELECT nextval('${seqName}') AS nextval`,
    );
    const num = Number(result[0].nextval);
    return `${year}-${String(num).padStart(4, '0')}`;
  }
}
```

### 5.7 ProjectFoldersService

```ts
const DEFAULT_FOLDERS = [
  { name: '文書', type: 'document' },
  { name: '図面', type: 'drawing' },
  { name: '工程', type: 'schedule' },
  { name: '写真', type: 'photo' },
  { name: '黒板', type: 'chalkboard' },
  { name: '検査', type: 'inspection' },
] as const;

@Injectable()
export class ProjectFoldersService {
  constructor(private readonly repo: FolderRepository) {}

  async createDefaultFolders(projectId: string, tx: Tx): Promise<void> {
    await Promise.all(
      DEFAULT_FOLDERS.map((f) =>
        this.repo.create({
          projectId,
          name: f.name,
          folderType: f.type,
          isPublicForInvited: false,
        }, tx),
      ),
    );
  }

  async list(projectId: string): Promise<Folder[]> {
    return this.repo.findByProject(projectId);
  }
}
```

### 5.8 ProjectMembersService

```ts
@Injectable()
export class ProjectMembersService {
  async list(projectId, requester) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new ProjectNotFoundError();

    // invited_worker chỉ list nếu là member
    if (requester.role === 'invited') {
      const isMember = await this.repo.findByProjectAndUser(projectId, requester.id);
      if (!isMember || isMember.revokedAt) throw new AuthInsufficientPermissionError();
    }

    return this.repo.findByProject(projectId);
  }

  async add(projectId, userId, roleOnProject, requester, ctx) {
    // Check permission: owner of project, or admin/manager
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new ProjectNotFoundError();
    const isOwner = project.ownerUserId === requester.id;
    if (!isOwner && !['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    // Validate user exists + active
    const user = await this.users.findById(userId);
    if (!user || user.status !== 'active') throw new UserNotActiveError(userId);

    // Check duplicate (UNIQUE constraint will also catch)
    const existing = await this.repo.findByProjectAndUser(projectId, userId);
    if (existing && !existing.revokedAt) throw new ProjectMemberAlreadyExistsError();

    return this.prisma.$transaction(async (tx) => {
      let member;
      if (existing?.revokedAt) {
        // Re-activate previously revoked member
        member = await this.repo.update(existing.id, { roleOnProject, revokedAt: null }, tx);
      } else {
        member = await this.repo.create({ projectId, userId, roleOnProject }, tx);
      }
      // Sync owner_user_id if role=owner
      if (roleOnProject === 'owner' && project.ownerUserId !== userId) {
        await this.projectRepo.update(projectId, { ownerUserId: userId }, tx);
      }
      await this.audit.logProjectMemberAdded(projectId, userId, roleOnProject, requester.id, ctx, tx);
      this.events.emit('project.member_added', { projectId, userId, roleOnProject });
      return member;
    });
  }

  async updateRole(projectId, userId, newRole, requester, ctx) {
    const member = await this.repo.findByProjectAndUser(projectId, userId);
    if (!member || member.revokedAt) throw new ProjectMemberNotFoundError();

    // Last-owner check: cannot demote last owner
    if (member.roleOnProject === 'owner' && newRole !== 'owner') {
      const ownerCount = await this.repo.countByProjectAndRole(projectId, 'owner');
      if (ownerCount <= 1) throw new ProjectCannotDemoteLastOwnerError();
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.update(member.id, { roleOnProject: newRole }, tx);
      await this.audit.logProjectMemberRoleChanged(projectId, userId, { from: member.roleOnProject, to: newRole }, requester.id, ctx, tx);
      return updated;
    });
  }

  async remove(projectId, userId, requester, ctx) {
    const member = await this.repo.findByProjectAndUser(projectId, userId);
    if (!member || member.revokedAt) throw new ProjectMemberNotFoundError();

    if (member.roleOnProject === 'owner') {
      const ownerCount = await this.repo.countByProjectAndRole(projectId, 'owner');
      if (ownerCount <= 1) throw new ProjectCannotRemoveLastOwnerError();
    }

    return this.prisma.$transaction(async (tx) => {
      await this.repo.softDelete(member.id, tx);  // sets revokedAt
      await this.audit.logProjectMemberRemoved(projectId, userId, requester.id, ctx, tx);
    });
  }
}
```

### 5.9 ProjectExportService

```ts
@Injectable()
export class ProjectExportService {
  async exportCsv(filter, requester, ctx, res: Response): Promise<void> {
    if (!['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }

    // Stream CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="projects_${Date.now()}.csv"`);
    res.write('﻿');  // BOM for Excel UTF-8 recognition

    const stringifier = stringify({
      header: true,
      columns: [
        'project_code', 'name', 'customer_name', 'property_address',
        'status', 'project_type', 'owner_name',
        'schedule_start', 'schedule_end', 'actual_start', 'actual_end',
        'amount_total', 'created_at',
      ],
    });
    stringifier.pipe(res);

    let totalRows = 0;
    const pageSize = 500;
    let page = 1;
    while (true) {
      const result = await this.projectRepo.list(
        { ...filter, page, pageSize, sortBy: 'createdAt', sortOrder: 'desc' },
        requester,
      );
      if (result.data.length === 0) break;
      for (const p of result.data) {
        stringifier.write({
          project_code: p.projectCode,
          name: p.name,
          customer_name: p.customer.name,
          property_address: p.property?.address ?? '',
          status: p.status,
          project_type: p.projectType,
          owner_name: p.owner.name,
          schedule_start: p.scheduleStart?.toISOString().split('T')[0] ?? '',
          schedule_end: p.scheduleEnd?.toISOString().split('T')[0] ?? '',
          actual_start: p.actualStart?.toISOString().split('T')[0] ?? '',
          actual_end: p.actualEnd?.toISOString().split('T')[0] ?? '',
          amount_total: p.amountTotal?.toString() ?? '',
          created_at: p.createdAt.toISOString(),
        });
        totalRows++;
      }
      if (result.data.length < pageSize) break;
      page++;
    }
    stringifier.end();

    // Audit after stream complete (best-effort)
    await this.audit.logProjectCsvExported(
      { rowCount: totalRows, filter },
      requester.id,
      ctx,
    );
  }
}
```

### 5.10 SavedSearchesService

```ts
@Injectable()
export class SavedSearchesService {
  async list(userId, scope) {
    return this.repo.findByUserAndScope(userId, scope);
  }

  async create(userId, input) {
    return this.repo.create({
      userId,
      scope: input.scope,
      name: input.name,
      filterJson: input.filterJson,
    });
  }

  async delete(id, userId) {
    const search = await this.repo.findById(id);
    if (!search || search.userId !== userId) throw new SavedSearchNotFoundError();
    return this.repo.delete(id);
  }
}
```

### 5.11 AuditService (upgrade từ Stub)

```ts
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // F8 existing method signatures kept
  async log(input: LogInput, tx?: Tx): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        changes: input.changes,
        ipAddress: input.ctx.ipAddress,
        userAgent: input.ctx.userAgent,
      },
    });
  }

  // F1 new convenience methods
  async logCustomerCreated(customerId, actorId, ctx, tx?) { /* call this.log(...) */ }
  async logCustomerUpdated(customerId, changes, actorId, ctx, tx?) { /* ... */ }
  async logCustomerDeleted(customerId, actorId, ctx, tx?) { /* ... */ }
  async logCustomerCsvImported(summary, actorId, ctx, tx?) { /* summary: {created, skipped, errorCount} */ }
  async logPropertyCreated(propertyId, actorId, ctx, tx?) { /* ... */ }
  async logPropertyUpdated(propertyId, changes, actorId, ctx, tx?) { /* ... */ }
  async logPropertyDeleted(propertyId, actorId, ctx, tx?) { /* ... */ }
  async logProjectCreated(projectId, actorId, ctx, tx?) { /* ... */ }
  async logProjectUpdated(projectId, changes, actorId, ctx, tx?) { /* ... */ }
  async logProjectDeleted(projectId, actorId, ctx, tx?) { /* ... */ }
  async logProjectStatusChanged(projectId, transition, actorId, ctx, tx?) { /* ... */ }
  async logProjectStatusReversed(projectId, transition, actorId, ctx, tx?) { /* ... */ }
  async logProjectCsvExported(meta, actorId, ctx) { /* meta: {rowCount, filter} */ }
  async logProjectMemberAdded(projectId, userId, roleOnProject, actorId, ctx, tx?) { /* ... */ }
  async logProjectMemberRoleChanged(projectId, userId, transition, actorId, ctx, tx?) { /* ... */ }
  async logProjectMemberRemoved(projectId, userId, actorId, ctx, tx?) { /* ... */ }
}
```

---

## 6. Error classes (mới — `shared/exceptions/customer-errors.ts` + `project-errors.ts`)

```ts
// customer-errors.ts
export class CustomerNotFoundError extends AppError {
  constructor(id?: string) {
    super('CUSTOMER_NOT_FOUND', 404, '顧客が見つかりません', { id });
  }
}

export class CustomerHasActiveProjectsError extends AppError {
  constructor(count: number, projects: Array<{ id: string; projectCode: string; name: string }>) {
    super('CUSTOMER_HAS_ACTIVE_PROJECTS', 409,
      `${count}件のアクティブな案件があるため削除できません`,
      { count, projects });
  }
}

export class PropertyNotFoundError extends AppError {
  constructor(id?: string) {
    super('PROPERTY_NOT_FOUND', 404, '物件が見つかりません', { id });
  }
}

export class PropertyPhotoTooManyError extends AppError {
  constructor() { super('PROPERTY_PHOTO_TOO_MANY', 400, '写真は3枚までです'); }
}

export class PropertyPhotoTooLargeError extends AppError {
  constructor() { super('PROPERTY_PHOTO_TOO_LARGE', 400, '写真サイズが大きすぎます（150KB上限）'); }
}

// project-errors.ts
export class ProjectNotFoundError extends AppError {
  constructor(id?: string) { super('PROJECT_NOT_FOUND', 404, '案件が見つかりません', { id }); }
}

export class ProjectInvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super('PROJECT_INVALID_STATUS_TRANSITION', 400,
      `ステータス遷移 ${from} → ${to} は許可されていません`,
      { from, to });
  }
}

export class ProjectMissingFieldForTransitionError extends AppError {
  constructor(field: string) {
    super('PROJECT_MISSING_FIELD_FOR_TRANSITION', 400,
      `この遷移には ${field} が必要です`, { field });
  }
}

export class ProjectMissingPropertyForHandoverError extends AppError {
  constructor() {
    super('PROJECT_MISSING_PROPERTY', 400, '引渡には物件のリンクが必要です');
  }
}

export class ProjectMissingHandoverDateError extends AppError {
  constructor() {
    super('PROJECT_MISSING_HANDOVER_DATE', 400, '物件の引渡日が未設定です');
  }
}

export class ProjectCancelReasonRequiredError extends AppError {
  constructor() {
    super('PROJECT_CANCEL_REASON_REQUIRED', 400, '理由（5文字以上）を入力してください');
  }
}

export class ProjectCustomerRequiredError extends AppError {
  constructor() {
    super('PROJECT_CUSTOMER_REQUIRED', 400, '顧客を選択するか、土地仕入れフラグを設定してください');
  }
}

export class ProjectInvalidOwnerError extends AppError {
  constructor() {
    super('PROJECT_INVALID_OWNER', 400, 'オーナーは admin/manager/employee である必要があります');
  }
}

export class ProjectMemberNotFoundError extends AppError {
  constructor() { super('PROJECT_MEMBER_NOT_FOUND', 404, 'メンバーが見つかりません'); }
}

export class ProjectMemberAlreadyExistsError extends AppError {
  constructor() { super('PROJECT_MEMBER_ALREADY_EXISTS', 409, '既にメンバーです'); }
}

export class ProjectCannotDemoteLastOwnerError extends AppError {
  constructor() { super('PROJECT_LAST_OWNER', 409, '最後のオーナーを降格できません'); }
}

export class ProjectCannotRemoveLastOwnerError extends AppError {
  constructor() { super('PROJECT_LAST_OWNER', 409, '最後のオーナーを外せません'); }
}

export class SavedSearchNotFoundError extends AppError {
  constructor() { super('SAVED_SEARCH_NOT_FOUND', 404, '保存した検索が見つかりません'); }
}
```

---

## 7. Controllers — Pattern (chi tiết endpoint xem api-contracts.md)

```ts
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @Roles('system_admin', 'manager', 'employee')
  async list(
    @Query() query: ListCustomersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles('system_admin', 'manager', 'employee')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return { customer: await this.service.findById(id, user) };
  }

  @Post()
  @Roles('system_admin', 'manager', 'employee')
  async create(
    @Body() dto: CreateCustomerDto,
    @Query('force') force: string,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.create(dto, user, buildCtx(req), force === 'true');
    if ('duplicateOf' in result) return result;  // 200 with duplicateOf
    return result;  // { customer }
  }

  // ... update, delete, getProperties, getProjects
}
```

---

## 8. Transactions strategy

### 8.1 Operations requiring transaction
- `customer.create/update/delete` + audit log: 1 transaction
- `property.update` + audit + event emit: 1 transaction (event emit AFTER commit via outbox pattern, hoặc sync trong transaction OK với EventEmitter2)
- `project.create` (resolve customer + insert project + folders + member + audit): SINGLE transaction
- `project.status_changed` + side effects + audit: 1 transaction
- `project_member` add/update/remove + audit: 1 transaction
- `customer_import` parsing → batch insert + audit: 1 transaction (rollback nếu error)

### 8.2 Isolation level
Default `READ COMMITTED` (PostgreSQL default) — đủ cho F1. KHÔNG cần `SERIALIZABLE` vì:
- Project code gen qua sequence (atomic)
- Soft delete check active count + update không race (vì project creation cũng dùng transaction)
- Optimistic lock có thể thêm Phase 2 nếu cần

### 8.3 Connection pooling
- Prisma client default pool (10 connections) đủ Phase 1
- Long-running transactions (CSV import) — set timeout 60s qua `prisma.$transaction(fn, { timeout: 60_000 })`

---

## 9. Event handling

### 9.1 EventEmitter2 config (đã có F8 in AppModule)
```ts
EventEmitterModule.forRoot({
  wildcard: false,
  delimiter: '.',
  maxListeners: 20,
  verboseMemoryLeak: false,
})
```

### 9.2 Internal listeners (Phase 1 = audit + future placeholder)

```ts
// modules/customer/events/customer.listener.ts
@Injectable()
export class CustomerEventListener {
  @OnEvent('property.handover_date_set')
  async handleHandoverDateSet(payload: PropertyHandoverPayload) {
    // Phase 1: log only (aftercare module chưa build)
    this.logger.log(`handover_date_set: property=${payload.propertyId}, date=${payload.handoverDate}`);
    // Phase 2 (aftercare): this.aftercareService.regenerateMaintenanceSchedule(propertyId);
  }
}
```

### 9.3 Sync semantics
- EventEmitter2 default sync — listener throw KHÔNG abort main flow (event emit là fire-and-forget)
- Future: dùng `emitAsync` nếu cần wait listener
- Transaction commits trước khi emit → safe để Phase 2 trigger side effects

---

## 10. Validation strategy

### 10.1 Class-validator on DTOs
```ts
export class CreateCustomerDto {
  @IsEnum(['individual', 'corporate'])
  customerType: 'individual' | 'corporate';

  @IsString()
  @Length(1, 200)
  name: string;

  @IsString() @Length(0, 200) @IsOptional()
  nameKana?: string;

  @IsString() @Length(0, 20) @IsOptional()
  phone?: string;

  @IsEmail() @Length(0, 255) @IsOptional()
  email?: string;

  @IsString() @Length(0, 2000) @IsOptional()
  address?: string;

  @IsBoolean() @IsOptional()
  isOb?: boolean;

  @IsDateString() @IsOptional()
  acquiredAt?: string;

  @IsString() @Length(0, 2000) @IsOptional()
  notes?: string;
}
```

### 10.2 Global ValidationPipe (đã có F8 main.ts)
```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
}));
```

### 10.3 Business validation
- Service-level (e.g., owner role check trong ProjectsService.create) — throws AppError subclass
- Repository: relies on DB constraints (UNIQUE, FK, NOT NULL) — caught + remapped trong service catch

---

## 11. Performance considerations

### 11.1 List query optimization
- Pagination strict 50/page (FE), API allow up to 100
- `count` parallel với `findMany` qua `Promise.all`
- `include` chỉ select fields needed (avoid loading `photoUrls`, `description` cho list view)
- Generated `search_text` + GIN index → FTS query in <100ms typical

### 11.2 CSV import batch
- Pre-fetch existing phones 1 query
- Batch insert qua single transaction (commit cuối)
- 2K rows ước hoàn tất <15s tại db.t4g.medium

### 11.3 N+1 prevention
- `project.list` include `customer, property, owner` từ đầu
- `customer.findById` (detail view) chỉ load customer; properties + projects load on-demand qua tab fetch separate

### 11.4 Index usage
Đã list ở BD §3.3. Critical paths:
- Customer search: `idx_customers_search_text` (GIN tsvector)
- Project list filter: `idx_projects_status_owner` + `idx_projects_customer`
- Member access check: `idx_project_members_user_revoked` (composite)

---

## 12. Testing strategy

### 12.1 Unit tests (Jest + jest-mock-extended)
File pattern: `<service>.spec.ts` cùng folder service.

**Priority specs cho F1**:
- `customers.service.spec.ts`: dedup check, soft-delete block, placeholder create
- `project-status-machine.service.spec.ts`: tất cả forward transitions valid/invalid; reverse only admin; side-effects (actualStart set)
- `project-code-generator.service.spec.ts`: format `YYYY-NNNN`, padding, sequence call
- `customer-import.service.spec.ts`: CSV parse + dedup + errors
- `project-members.service.spec.ts`: last-owner protect, duplicate add, revoke reactivate

**Skip**:
- Controllers (thin layer)
- Simple CRUD repository methods (trust Prisma)

### 12.2 E2E tests (defer F9)
Pattern same as F8: Supertest against test DB schema.

### 12.3 Test data setup
```ts
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE projects, properties, customers RESTART IDENTITY CASCADE`;
  // Seed test users
  await seedTestUsers(prisma);
});
```

---

## 13. Migration

### 13.1 Prisma migration generation
```bash
pnpm --filter backend prisma:migrate:dev --name add_f1_customer_project
```
Generated migration sẽ chứa: enums + tables + FKs + B-tree indexes.

### 13.2 Raw SQL migration (manual file)
File: `prisma/migrations/<timestamp>_add_f1_fts_and_sequences/migration.sql`
```sql
-- Generated tsvector columns
ALTER TABLE customers ADD COLUMN search_text tsvector GENERATED ALWAYS AS (...) STORED;
ALTER TABLE projects ADD COLUMN search_text tsvector GENERATED ALWAYS AS (...) STORED;

-- GIN indexes
CREATE INDEX idx_customers_search_text ON customers USING gin(search_text) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_address_trgm ON customers USING gin(address gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_search_text ON projects USING gin(search_text) WHERE deleted_at IS NULL;

-- Sequences
CREATE SEQUENCE IF NOT EXISTS project_code_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS project_code_seq_2027 START 1;
```

### 13.3 Seed update
Thêm vào `prisma/seed.ts` (dev only):
- 3-5 customer test
- 5-8 property gắn với customers
- 5-10 project across statuses
- Members default per project

---

## 14. Dependencies new (BE)

```bash
pnpm --filter backend add csv-parse csv-stringify
```

- `csv-parse@^5` — parse stream
- `csv-stringify@^6` — generate export CSV

No other new external deps. NestJS, Prisma, EventEmitter2, class-validator all already installed from F8.

---

## 15. Out of scope (BDD reminder)

- ❌ Backend caching (Redis) — không cần Phase 1
- ❌ BullMQ async event — Phase 2
- ❌ pg_bigm Japanese FTS optimize — Phase 2
- ❌ S3 photo upload — Phase 2 (F3)
- ❌ Audit log archive S3 Glacier — Phase 2
- ❌ Optimistic locking on entities — Phase 2 nếu cần
- ❌ Full E2E test suite — defer F9

---

*Generated by /design --detail (BDD part) — F1 Backend Detail Design BASE*
