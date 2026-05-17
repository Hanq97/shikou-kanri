import { Injectable } from '@nestjs/common';
import { Prisma, SavedSearch } from '@prisma/client';
import { AuthInsufficientPermissionError } from '../../../shared/exceptions/auth-errors';
import { SavedSearchNotFoundError } from '../../../shared/exceptions/project-errors';
import { AuthenticatedUser } from '../../auth/domain/types';
import {
  CreateSavedSearchDto,
  SavedSearchScope,
} from '../dto/saved-search.dto';
import { SavedSearchRepository } from '../repositories/saved-search.repository';

@Injectable()
export class SavedSearchesService {
  constructor(private readonly repo: SavedSearchRepository) {}

  list(
    requester: AuthenticatedUser,
    scope?: SavedSearchScope,
  ): Promise<SavedSearch[]> {
    return this.repo.findByUser(requester.id, scope);
  }

  create(
    input: CreateSavedSearchDto,
    requester: AuthenticatedUser,
  ): Promise<SavedSearch> {
    return this.repo.create({
      userId: requester.id,
      name: input.name,
      scope: input.scope,
      filterJson: input.filterJson as Prisma.InputJsonValue,
    });
  }

  async delete(id: string, requester: AuthenticatedUser): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new SavedSearchNotFoundError(id);
    if (existing.userId !== requester.id) {
      throw new AuthInsufficientPermissionError();
    }
    await this.repo.delete(id);
  }
}
