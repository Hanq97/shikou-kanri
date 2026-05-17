import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { AuditStubService } from '../modules/auth/internal/audit-stub.service';
import { UserRepository } from '../modules/auth/repositories/user.repository';

interface EmergencyDisable2FaOptions {
  email?: string;
  reason?: string;
  yes?: boolean;
}

/**
 * Emergency recovery: disable 2FA for a user without UI access.
 *
 * Use case: primary system admin lost authenticator app + backup codes, only 1 admin exists
 * → cannot recover via /admin/users (would require a different admin to perform the action).
 *
 * Usage:
 *   pnpm --filter backend cli emergency:disable-2fa \
 *     --email admin@dev.shikou-kanri.local \
 *     --reason "Lost authenticator, factory reset phone 2026-05-16" \
 *     --yes
 *
 * Effects on target user:
 *  - twoFaEnabled       = false
 *  - twoFaSecret        = null
 *  - twoFaRecoveryCodes = null
 *  - forceTwoFaEnrollment = true  (if role = system_admin — must re-enroll on next login)
 *  - Audit log entry recorded (actor = CLI / system).
 */
@Command({
  name: 'emergency:disable-2fa',
  description:
    'Disable 2FA for a user from CLI (recovery when UI path is blocked)',
})
export class EmergencyDisable2FaCommand extends CommandRunner {
  private readonly logger = new Logger(EmergencyDisable2FaCommand.name);

  constructor(
    private readonly users: UserRepository,
    private readonly audit: AuditStubService,
  ) {
    super();
  }

  async run(
    _params: string[],
    options: EmergencyDisable2FaOptions,
  ): Promise<void> {
    if (!options.email) {
      this.logger.error('--email is required');
      process.exit(1);
    }
    if (!options.reason || options.reason.trim().length < 10) {
      this.logger.error('--reason is required (min 10 chars, for audit)');
      process.exit(1);
    }
    if (!options.yes) {
      this.logger.error(
        'Refusing to proceed without --yes flag. This is an irreversible security action.',
      );
      process.exit(1);
    }

    const email = options.email.toLowerCase();
    const user = await this.users.findByEmail(email, undefined, true);
    if (!user) {
      this.logger.error(`User not found: ${email}`);
      process.exit(1);
    }

    if (!user.twoFaEnabled) {
      this.logger.warn(
        `User ${email} does not have 2FA enabled — nothing to disable.`,
      );
      process.exit(0);
    }

    const isAdmin = user.role === 'system_admin';
    await this.users.update(user.id, {
      twoFaEnabled: false,
      twoFaSecret: null,
      twoFaRecoveryCodes: null,
      ...(isAdmin ? { forceTwoFaEnrollment: true } : {}),
    });

    await this.audit.log2FaDisable(user.id, 'cli_emergency', null, {
      ipAddress: null,
      userAgent: 'cli/emergency-disable-2fa',
      traceId: `cli-${Date.now()}`,
    });

    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log('✅ 2FA disabled (CLI emergency)');
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log(`  User:     ${user.email} (${user.role})`);
    // eslint-disable-next-line no-console
    console.log(`  Reason:   ${options.reason}`);
    // eslint-disable-next-line no-console
    console.log(
      `  Re-enroll required on next login: ${isAdmin ? 'YES (admin)' : 'no'}`,
    );
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log('⚠️  Audit log entry recorded. Inform the user immediately.');
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
  }

  @Option({ flags: '-e, --email <email>', description: 'Target user email' })
  parseEmail(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --reason <reason>',
    description:
      'Reason for emergency disable (10+ chars, recorded in audit log)',
  })
  parseReason(val: string): string {
    return val;
  }

  @Option({
    flags: '-y, --yes',
    description: 'Confirm execution (required to prevent accidents)',
  })
  parseYes(): boolean {
    return true;
  }
}
