import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

@Injectable()
export class AesService {
  private readonly key: Buffer;

  constructor(config: AppConfigService) {
    this.key = Buffer.from(config.get('TWOFA_ENCRYPTION_KEY'), 'hex');
  }

  encrypt(plaintext: string | Buffer): Buffer {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const data = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]);
  }

  decrypt(payload: Buffer): Buffer {
    if (payload.length < IV_LEN + TAG_LEN) {
      throw new Error('Encrypted payload too short');
    }
    const iv = payload.subarray(0, IV_LEN);
    const authTag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = payload.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  decryptToString(payload: Buffer): string {
    return this.decrypt(payload).toString('utf8');
  }
}
