import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../repositories/customer.repository';
import { DuplicateCheckResult } from '../domain/types';
import { normalizePhone } from '../utils/normalize-phone';

@Injectable()
export class CustomerDuplicateCheckService {
  constructor(private readonly repo: CustomerRepository) {}

  async checkPhone(phone?: string | null): Promise<DuplicateCheckResult> {
    const normalized = normalizePhone(phone);
    if (!normalized) return { duplicateOf: null };
    const existing = await this.repo.findByPhone(normalized);
    if (!existing) return { duplicateOf: null };
    return {
      duplicateOf: {
        id: existing.id,
        name: existing.name,
        address: existing.address,
      },
    };
  }
}
