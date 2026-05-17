import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { CustomerModule } from '../customer/customer.module';
import { ProjectMembersController } from './controllers/project-members.controller';
import { ProjectsController } from './controllers/projects.controller';
import { SavedSearchesController } from './controllers/saved-searches.controller';
import { FolderRepository } from './repositories/folder.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { ProjectRepository } from './repositories/project.repository';
import { SavedSearchRepository } from './repositories/saved-search.repository';
import { ProjectCodeGeneratorService } from './services/project-code-generator.service';
import { ProjectExportService } from './services/project-export.service';
import { ProjectFoldersService } from './services/project-folders.service';
import { ProjectMembersService } from './services/project-members.service';
import { ProjectStatusMachineService } from './services/project-status-machine.service';
import { ProjectsService } from './services/projects.service';
import { SavedSearchesService } from './services/saved-searches.service';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [
    ProjectsController,
    ProjectMembersController,
    SavedSearchesController,
  ],
  providers: [
    ProjectsService,
    ProjectStatusMachineService,
    ProjectMembersService,
    SavedSearchesService,
    ProjectCodeGeneratorService,
    ProjectFoldersService,
    ProjectExportService,
    ProjectRepository,
    ProjectMemberRepository,
    FolderRepository,
    SavedSearchRepository,
  ],
  exports: [
    ProjectsService,
    ProjectStatusMachineService,
    ProjectMembersService,
    SavedSearchesService,
    ProjectRepository,
    ProjectMemberRepository,
    FolderRepository,
  ],
})
export class ProjectModule {}
