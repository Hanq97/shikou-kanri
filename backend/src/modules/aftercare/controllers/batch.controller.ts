import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AftercareBatchService } from '../services/aftercare-batch.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('aftercare/batch')
export class BatchController {
  constructor(private readonly batch: AftercareBatchService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @Roles('system_admin')
  async run() {
    return this.batch.run();
  }
}
