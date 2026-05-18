import { Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { AftercareBatchService } from '../modules/aftercare/services/aftercare-batch.service';

/**
 * Run the aftercare daily batch (mark overdue + send reminders).
 *
 * Usage:
 *   pnpm --filter backend cli aftercare:run-batch
 *
 * Effects:
 *  - Pending/notified schedules with scheduledDate < today → status='overdue'
 *  - Pending schedules within 14 days → email reminder + status='notified'
 */
@Command({
  name: 'aftercare:run-batch',
  description:
    'Run the aftercare daily batch immediately (normally runs at 8:00 JST via cron)',
})
export class AftercareRunBatchCommand extends CommandRunner {
  private readonly logger = new Logger(AftercareRunBatchCommand.name);

  constructor(private readonly batch: AftercareBatchService) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log('Running aftercare batch...');
    const result = await this.batch.run();
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log('✅ Aftercare batch complete');
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log(`  Notified:           ${result.notifiedCount}`);
    // eslint-disable-next-line no-console
    console.log(`  Emails sent:        ${result.emailsSent}`);
    // eslint-disable-next-line no-console
    console.log(`  Marked overdue:     ${result.overdueMarkedCount}`);
    // eslint-disable-next-line no-console
    console.log(`  Ran at:             ${result.ranAt}`);
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
  }
}
