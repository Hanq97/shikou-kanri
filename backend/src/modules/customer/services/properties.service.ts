import { EventEmitter2 } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { Property } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import {
  CustomerNotFoundError,
  PropertyNotFoundError,
  PropertyPhotoTooLargeError,
  PropertyPhotoTooManyError,
} from '../../../shared/exceptions/customer-errors';
import { AuthenticatedUser, RequestContext } from '../../auth/domain/types';
import { AuditStubService, Tx } from '../../auth/internal/audit-stub.service';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { PropertyRepository } from '../repositories/property.repository';

export interface PropertyDto {
  id: string;
  customerId: string;
  address: string;
  propertyType: string;
  structure: string;
  yearBuilt: number | null;
  handoverDate: Date | null;
  floorAreaSqm: string | null;
  photoUrls: string[];
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 150_000;

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: PropertyRepository,
    private readonly customerRepo: CustomerRepository,
    private readonly audit: AuditStubService,
    private readonly events: EventEmitter2,
  ) {}

  async listByCustomer(
    customerId: string,
    requester: AuthenticatedUser,
  ): Promise<PropertyDto[]> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) throw new CustomerNotFoundError(customerId);
    const props = await this.repo.findByCustomer(customerId);
    return props.map((p) => this.toDto(p));
  }

  async findById(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<PropertyDto> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();
    const prop = await this.repo.findById(id);
    if (!prop) throw new PropertyNotFoundError(id);
    return this.toDto(prop);
  }

  async create(
    input: CreatePropertyDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PropertyDto> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();

    const customer = await this.customerRepo.findById(input.customerId);
    if (!customer) throw new CustomerNotFoundError(input.customerId);

    this.validatePhotos(input.photoUrls);

    const property = await this.prisma.$transaction(async (tx) => {
      const created = await this.repo.create(
        {
          customer: { connect: { id: input.customerId } },
          address: input.address,
          propertyType: input.propertyType,
          structure: input.structure,
          yearBuilt: input.yearBuilt ?? null,
          handoverDate: input.handoverDate
            ? new Date(input.handoverDate)
            : null,
          floorAreaSqm: input.floorAreaSqm ?? null,
          photoUrls: input.photoUrls ?? [],
          notes: input.notes || null,
          createdBy: { connect: { id: requester.id } },
          updatedBy: { connect: { id: requester.id } },
        },
        tx as Tx,
      );
      await this.audit.logPropertyCreated(
        created.id,
        requester.id,
        ctx,
        tx as Tx,
      );
      return created;
    });

    if (property.handoverDate) {
      this.events.emit('property.handover_date_set', {
        propertyId: property.id,
        customerId: property.customerId,
        handoverDate: property.handoverDate,
      });
    }

    return this.toDto(property);
  }

  async update(
    id: string,
    input: UpdatePropertyDto,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<PropertyDto> {
    if (requester.role === 'invited')
      throw new AuthInsufficientPermissionError();

    const existing = await this.repo.findById(id);
    if (!existing) throw new PropertyNotFoundError(id);

    this.validatePhotos(input.photoUrls);

    const prevHandover = existing.handoverDate?.getTime() ?? null;
    const newHandover =
      input.handoverDate !== undefined
        ? input.handoverDate
          ? new Date(input.handoverDate).getTime()
          : null
        : prevHandover;
    const handoverChanged = newHandover !== prevHandover;

    const changed = this.diffFields(existing, input);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.repo.update(
        id,
        {
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.propertyType !== undefined
            ? { propertyType: input.propertyType }
            : {}),
          ...(input.structure !== undefined
            ? { structure: input.structure }
            : {}),
          ...(input.yearBuilt !== undefined
            ? { yearBuilt: input.yearBuilt ?? null }
            : {}),
          ...(input.handoverDate !== undefined
            ? {
                handoverDate: input.handoverDate
                  ? new Date(input.handoverDate)
                  : null,
              }
            : {}),
          ...(input.floorAreaSqm !== undefined
            ? { floorAreaSqm: input.floorAreaSqm ?? null }
            : {}),
          ...(input.photoUrls !== undefined
            ? { photoUrls: input.photoUrls }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
          updatedBy: { connect: { id: requester.id } },
        },
        tx as Tx,
      );
      if (changed.length > 0) {
        await this.audit.logPropertyUpdated(
          id,
          changed,
          requester.id,
          ctx,
          tx as Tx,
        );
      }
      return result;
    });

    if (handoverChanged && updated.handoverDate) {
      this.events.emit('property.handover_date_set', {
        propertyId: updated.id,
        customerId: updated.customerId,
        handoverDate: updated.handoverDate,
      });
    }

    return this.toDto(updated);
  }

  async softDelete(
    id: string,
    requester: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<void> {
    if (!['system_admin', 'manager'].includes(requester.role)) {
      throw new AuthInsufficientPermissionError();
    }
    const property = await this.repo.findById(id);
    if (!property) throw new PropertyNotFoundError(id);

    await this.prisma.$transaction(async (tx) => {
      await this.repo.softDelete(id, requester.id, tx as Tx);
      await this.audit.logPropertyDeleted(id, requester.id, ctx, tx as Tx);
    });
  }

  private validatePhotos(photos?: string[]): void {
    if (!photos) return;
    if (photos.length > MAX_PHOTOS) throw new PropertyPhotoTooManyError();
    for (const p of photos) {
      if (p.length > MAX_PHOTO_BYTES) throw new PropertyPhotoTooLargeError();
    }
  }

  toDto(p: Property): PropertyDto {
    return {
      id: p.id,
      customerId: p.customerId,
      address: p.address,
      propertyType: p.propertyType,
      structure: p.structure,
      yearBuilt: p.yearBuilt,
      handoverDate: p.handoverDate,
      floorAreaSqm: p.floorAreaSqm?.toString() ?? null,
      photoUrls: p.photoUrls,
      notes: p.notes,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      createdById: p.createdById,
      updatedById: p.updatedById,
    };
  }

  private diffFields(before: Property, input: UpdatePropertyDto): string[] {
    const changed: string[] = [];
    if (input.address !== undefined && input.address !== before.address)
      changed.push('address');
    if (
      input.propertyType !== undefined &&
      input.propertyType !== before.propertyType
    )
      changed.push('propertyType');
    if (input.structure !== undefined && input.structure !== before.structure)
      changed.push('structure');
    if (
      input.yearBuilt !== undefined &&
      (input.yearBuilt ?? null) !== before.yearBuilt
    )
      changed.push('yearBuilt');
    if (input.handoverDate !== undefined) {
      const newDate = input.handoverDate
        ? new Date(input.handoverDate).getTime()
        : null;
      const oldDate = before.handoverDate?.getTime() ?? null;
      if (newDate !== oldDate) changed.push('handoverDate');
    }
    if (input.floorAreaSqm !== undefined) {
      const oldFloor = before.floorAreaSqm?.toString() ?? null;
      const newFloor = input.floorAreaSqm?.toString() ?? null;
      if (oldFloor !== newFloor) changed.push('floorAreaSqm');
    }
    if (
      input.photoUrls !== undefined &&
      JSON.stringify(input.photoUrls) !== JSON.stringify(before.photoUrls)
    )
      changed.push('photoUrls');
    if (input.notes !== undefined && (input.notes || null) !== before.notes)
      changed.push('notes');
    return changed;
  }
}
