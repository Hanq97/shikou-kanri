import { Injectable } from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';

const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O/1/I/L for clarity

@Injectable()
export class RandomService {
  /** Random base64url string from `bytes` random bytes (e.g. 32 bytes → 43 chars). */
  base64Url(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }

  /** Random hex string of `bytes` random bytes (e.g. 16 bytes → 32 chars). */
  hex(bytes = 16): string {
    return randomBytes(bytes).toString('hex');
  }

  /** Generate `length` chars from custom alphabet using crypto-safe random ints. */
  fromAlphabet(alphabet: string, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += alphabet[randomInt(alphabet.length)];
    }
    return result;
  }

  /** 10 backup codes, each 10 chars from the unambiguous alphabet. */
  generateBackupCodes(count = 10, length = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.fromAlphabet(BACKUP_CODE_ALPHABET, length));
    }
    return codes;
  }

  /** Cryptographically secure temp password meeting policy (≥12 chars, 4 classes). */
  generateTempPassword(length = 16): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digit = '23456789';
    const symbol = '!@#$%^&*-_=+';
    const all = upper + lower + digit + symbol;

    // Guarantee at least one from each class
    const required = [
      upper[randomInt(upper.length)],
      lower[randomInt(lower.length)],
      digit[randomInt(digit.length)],
      symbol[randomInt(symbol.length)],
    ];
    const remaining: string[] = [];
    for (let i = 0; i < length - required.length; i++) {
      remaining.push(all[randomInt(all.length)]);
    }
    const all_chars = [...required, ...remaining];
    // Shuffle (Fisher-Yates with crypto random)
    for (let i = all_chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [all_chars[i], all_chars[j]] = [all_chars[j], all_chars[i]];
    }
    return all_chars.join('');
  }
}
