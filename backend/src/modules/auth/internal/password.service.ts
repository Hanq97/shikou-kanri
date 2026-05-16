import { Injectable } from '@nestjs/common';
import { Argon2Service } from '../../../shared/crypto/argon2.service';
import { AuthPasswordWeakError } from '../../../shared/exceptions/auth-errors';
import { validatePasswordPolicy } from '../domain/password-policy';

@Injectable()
export class PasswordService {
  constructor(private readonly argon2: Argon2Service) {}

  validatePolicy(plaintext: string): void {
    const result = validatePasswordPolicy(plaintext);
    if (!result.valid) {
      throw new AuthPasswordWeakError(result.failures);
    }
  }

  async hash(plaintext: string): Promise<string> {
    return this.argon2.hash(plaintext);
  }

  async verify(
    hash: string | null | undefined,
    plaintext: string,
  ): Promise<boolean> {
    // Constant-time-ish: still run verify with a known invalid hash to keep timing consistent
    if (!hash) {
      await this.argon2
        .verify(
          '$argon2id$v=19$m=65536,t=3,p=4$YWFhYWFhYWFhYWFhYWFhYQ$X',
          plaintext,
        )
        .catch(() => false);
      return false;
    }
    return this.argon2.verify(hash, plaintext);
  }
}
