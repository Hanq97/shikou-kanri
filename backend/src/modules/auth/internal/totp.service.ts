import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { AesService } from '../../../shared/crypto/aes.service';
import { HashService } from '../../../shared/crypto/hash.service';
import { RandomService } from '../../../shared/crypto/random.service';

const TOTP_ISSUER = 'Shikou-Kanri';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 10;

authenticator.options = {
  step: 30,
  window: 1,
  digits: 6,
};

export interface BackupCodeRecord {
  code: string;
  used: boolean;
}

@Injectable()
export class TotpService {
  constructor(
    private readonly random: RandomService,
    private readonly aes: AesService,
    private readonly hashes: HashService,
  ) {}

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  buildOtpauthUri(email: string, secret: string): string {
    return authenticator.keyuri(email, TOTP_ISSUER, secret);
  }

  async generateQrCode(otpauthUri: string): Promise<string> {
    return QRCode.toDataURL(otpauthUri, {
      errorCorrectionLevel: 'M',
      width: 240,
    });
  }

  verify(code: string, secret: string): boolean {
    try {
      return authenticator.verify({ token: code, secret });
    } catch {
      return false;
    }
  }

  generateBackupCodes(
    count = BACKUP_CODE_COUNT,
    length = BACKUP_CODE_LENGTH,
  ): string[] {
    return this.random.generateBackupCodes(count, length);
  }

  encryptSecret(secret: string): Buffer {
    return this.aes.encrypt(secret);
  }

  decryptSecret(encrypted: Buffer): string {
    return this.aes.decryptToString(encrypted);
  }

  encryptBackupCodes(codes: string[]): Buffer {
    const records: BackupCodeRecord[] = codes.map((code) => ({
      code,
      used: false,
    }));
    return this.aes.encrypt(JSON.stringify(records));
  }

  decryptBackupCodes(encrypted: Buffer): BackupCodeRecord[] {
    const json = this.aes.decryptToString(encrypted);
    return JSON.parse(json) as BackupCodeRecord[];
  }

  verifyAndConsumeBackupCode(
    plaintext: string,
    encryptedRecords: Buffer,
  ): { valid: boolean; updatedEncrypted?: Buffer; remaining: number } {
    const records = this.decryptBackupCodes(encryptedRecords);
    const normalized = plaintext.replace(/\s/g, '').toUpperCase();

    let matched = false;
    const updated = records.map((record) => {
      if (record.used) return record;
      if (!matched && this.hashes.constantTimeEqual(record.code, normalized)) {
        matched = true;
        return { ...record, used: true };
      }
      return record;
    });

    const remaining = updated.filter((r) => !r.used).length;

    if (!matched) return { valid: false, remaining };
    return {
      valid: true,
      updatedEncrypted: this.aes.encrypt(JSON.stringify(updated)),
      remaining,
    };
  }
}
