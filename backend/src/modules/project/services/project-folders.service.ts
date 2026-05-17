import { Injectable } from '@nestjs/common';
import { Folder } from '@prisma/client';
import { Tx } from '../../auth/internal/audit-stub.service';
import { FolderTypeName } from '../domain/types';
import { FolderRepository } from '../repositories/folder.repository';

interface DefaultFolderSpec {
  name: string;
  type: FolderTypeName;
}

const DEFAULT_FOLDERS: readonly DefaultFolderSpec[] = [
  { name: '文書', type: 'document' },
  { name: '図面', type: 'drawing' },
  { name: '工程', type: 'schedule' },
  { name: '写真', type: 'photo' },
  { name: '黒板', type: 'chalkboard' },
  { name: '検査', type: 'inspection' },
];

@Injectable()
export class ProjectFoldersService {
  constructor(private readonly repo: FolderRepository) {}

  async createDefaultFolders(projectId: string, tx: Tx): Promise<void> {
    await Promise.all(
      DEFAULT_FOLDERS.map((f) =>
        this.repo.create(
          {
            projectId,
            name: f.name,
            folderType: f.type,
            isPublicForInvited: false,
          },
          tx,
        ),
      ),
    );
  }

  list(projectId: string): Promise<Folder[]> {
    return this.repo.findByProject(projectId);
  }
}
