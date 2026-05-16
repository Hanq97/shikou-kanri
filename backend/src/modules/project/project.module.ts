import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { CustomerModule } from '../customer/customer.module';
import { ProjectsController } from './controllers/projects.controller';
import { FolderRepository } from './repositories/folder.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectCodeGeneratorService } from './services/project-code-generator.service';
import { ProjectFoldersService } from './services/project-folders.service';
import { ProjectStatusMachineService } from './services/project-status-machine.service';
import { ProjectsService } from './services/projects.service';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectStatusMachineService,
    ProjectCodeGeneratorService,
    ProjectFoldersService,
    ProjectRepository,
    ProjectMemberRepository,
    FolderRepository,
  ],
  exports: [
    ProjectsService,
    ProjectStatusMachineService,
    ProjectRepository,
    ProjectMemberRepository,
    FolderRepository,
  ],
})
export class ProjectModule {}
