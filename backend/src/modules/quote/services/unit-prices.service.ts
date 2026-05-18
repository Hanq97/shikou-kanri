import { Injectable } from '@nestjs/common';
import { UnitPrice } from '@prisma/client';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import {
  UnitPriceCodeExistsError,
  UnitPriceNotFoundError,
} from '../../../shared/exceptions/quote-errors';
import { AuthenticatedUser } from '../../auth/domain/types';
import { CreateUnitPriceDto } from '../dto/create-unit-price.dto';
import { UpdateUnitPriceDto } from '../dto/update-unit-price.dto';
import { ListUnitPricesFilter } from '../domain/types';
import { UnitPriceRepository } from '../repositories/unit-price.repository';

const READ_ROLES = new Set(['system_admin', 'manager', 'employee']);

@Injectable()
export class UnitPricesService {
  constructor(private readonly repo: UnitPriceRepository) {}

  async list(
    filter: ListUnitPricesFilter,
    requester: AuthenticatedUser,
  ): Promise<{
    data: UnitPrice[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    if (!READ_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();
    const result = await this.repo.list(filter);
    return {
      data: result.data,
      total: result.total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findById(id: string, requester: AuthenticatedUser): Promise<UnitPrice> {
    if (!READ_ROLES.has(requester.role))
      throw new AuthInsufficientPermissionError();
    const item = await this.repo.findById(id);
    if (!item) throw new UnitPriceNotFoundError(id);
    return item;
  }

  async create(
    input: CreateUnitPriceDto,
    requester: AuthenticatedUser,
  ): Promise<UnitPrice> {
    if (requester.role !== 'system_admin')
      throw new AuthInsufficientPermissionError();

    const existing = await this.repo.findByCode(input.code);
    if (existing) throw new UnitPriceCodeExistsError(input.code);

    return this.repo.create({
      code: input.code,
      category: input.category ?? null,
      itemName: input.itemName,
      description: input.description ?? null,
      unit: input.unit,
      defaultUnitPrice: input.defaultUnitPrice,
      supplierName: input.supplierName ?? null,
      isActive: input.isActive ?? true,
      createdById: requester.id,
      updatedById: requester.id,
    });
  }

  async update(
    id: string,
    input: UpdateUnitPriceDto,
    requester: AuthenticatedUser,
  ): Promise<UnitPrice> {
    if (requester.role !== 'system_admin')
      throw new AuthInsufficientPermissionError();
    const existing = await this.repo.findById(id);
    if (!existing) throw new UnitPriceNotFoundError(id);
    return this.repo.update(id, {
      ...(input.category !== undefined
        ? { category: input.category || null }
        : {}),
      ...(input.itemName !== undefined ? { itemName: input.itemName } : {}),
      ...(input.description !== undefined
        ? { description: input.description || null }
        : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.defaultUnitPrice !== undefined
        ? { defaultUnitPrice: input.defaultUnitPrice }
        : {}),
      ...(input.supplierName !== undefined
        ? { supplierName: input.supplierName || null }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedBy: { connect: { id: requester.id } },
    });
  }

  async softDelete(id: string, requester: AuthenticatedUser): Promise<void> {
    if (requester.role !== 'system_admin')
      throw new AuthInsufficientPermissionError();
    const existing = await this.repo.findById(id);
    if (!existing) throw new UnitPriceNotFoundError(id);
    await this.repo.softDelete(id, requester.id);
  }
}
