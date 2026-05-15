export interface PasswordPolicyFailure {
  rule: 'min_length' | 'uppercase' | 'lowercase' | 'digit' | 'symbol';
  message: string;
}

export interface PasswordPolicyResult {
  valid: boolean;
  failures: PasswordPolicyFailure[];
}

const RULES: PasswordPolicyFailure[] = [
  { rule: 'min_length', message: '12文字以上必要です' },
  { rule: 'uppercase', message: '大文字を含める必要があります' },
  { rule: 'lowercase', message: '小文字を含める必要があります' },
  { rule: 'digit', message: '数字を含める必要があります' },
  { rule: 'symbol', message: '記号を含める必要があります' },
];

export const PASSWORD_MIN_LENGTH = 12;

export function validatePasswordPolicy(plaintext: string): PasswordPolicyResult {
  const failures: PasswordPolicyFailure[] = [];

  if (plaintext.length < PASSWORD_MIN_LENGTH) failures.push(RULES[0]);
  if (!/[A-Z]/.test(plaintext)) failures.push(RULES[1]);
  if (!/[a-z]/.test(plaintext)) failures.push(RULES[2]);
  if (!/[0-9]/.test(plaintext)) failures.push(RULES[3]);
  if (!/[^A-Za-z0-9]/.test(plaintext)) failures.push(RULES[4]);

  return { valid: failures.length === 0, failures };
}
