import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { RandomService } from '../shared/crypto/random.service';
import { PasswordService } from '../modules/auth/internal/password.service';
import { UserRepository } from '../modules/auth/repositories/user.repository';
import { AuditStubService } from '../modules/auth/internal/audit-stub.service';

interface BootstrapAdminOptions {
  email?: string;
  name?: string;
  force?: boolean;
}

@Command({
  name: 'bootstrap:create-admin',
  description: 'Tạo system administrator đầu tiên cho fresh deployment',
})
export class BootstrapCreateAdminCommand extends CommandRunner {
  private readonly logger = new Logger(BootstrapCreateAdminCommand.name);

  constructor(
    private readonly users: UserRepository,
    private readonly password: PasswordService,
    private readonly random: RandomService,
    private readonly audit: AuditStubService,
  ) {
    super();
  }

  async run(_params: string[], options: BootstrapAdminOptions): Promise<void> {
    if (!options.email) {
      this.logger.error('--email is required');
      process.exit(1);
    }
    if (!options.name) {
      this.logger.error('--name is required');
      process.exit(1);
    }

    const email = options.email.toLowerCase();

    // Idempotent check
    const adminCount = await this.users.countByRole('system_admin', true);
    if (adminCount > 0 && !options.force) {
      this.logger.error(
        `System administrator đã tồn tại (${adminCount} active). Dùng --force nếu muốn tạo thêm.`,
      );
      process.exit(1);
    }

    const existing = await this.users.findByEmail(email, undefined, true);
    if (existing) {
      this.logger.error(`User với email ${email} đã tồn tại.`);
      process.exit(1);
    }

    // Generate temp password (16 chars, meets policy)
    const tempPassword = this.random.generateTempPassword(16);
    const passwordHash = await this.password.hash(tempPassword);

    const user = await this.users.create({
      email,
      name: options.name,
      role: 'system_admin',
      status: 'active',
      passwordHash,
      forcePasswordChange: true,
      forceTwoFaEnrollment: true,
    });

    await this.audit.logUserBootstrap(user.id, email);

    // eslint-disable-next-line no-console
    console.log('');
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log('✅ System administrator created');
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log(`  Email:              ${user.email}`);
    // eslint-disable-next-line no-console
    console.log(`  Name:               ${user.name}`);
    // eslint-disable-next-line no-console
    console.log(`  Temporary password: ${tempPassword}`);
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
    // eslint-disable-next-line no-console
    console.log('⚠️  User MUST change password and enroll 2FA on first login.');
    // eslint-disable-next-line no-console
    console.log('   (This password is shown ONCE — save it now.)');
    // eslint-disable-next-line no-console
    console.log('═══════════════════════════════════════════════════════════');
  }

  @Option({ flags: '-e, --email <email>', description: 'Admin email address' })
  parseEmail(val: string): string {
    return val;
  }

  @Option({ flags: '-n, --name <name>', description: 'Admin display name' })
  parseName(val: string): string {
    return val;
  }

  @Option({ flags: '-f, --force', description: 'Create even if admin exists' })
  parseForce(): boolean {
    return true;
  }
}
