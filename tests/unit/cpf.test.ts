import { describe, it, expect } from 'vitest';
import { validateCpf } from '@/lib/cpf';

describe('validateCpf', () => {
  it('accepts valid CPF (plain)', () => {
    expect(validateCpf('11144477735')).toBe(true);
  });

  it('accepts valid CPF (formatted)', () => {
    expect(validateCpf('111.444.777-35')).toBe(true);
  });

  it('rejects all-same-digit CPF', () => {
    expect(validateCpf('00000000000')).toBe(false);
    expect(validateCpf('11111111111')).toBe(false);
  });

  it('rejects wrong verifier digits', () => {
    expect(validateCpf('11144477736')).toBe(false); // last digit wrong
    expect(validateCpf('11144477725')).toBe(false); // second-to-last wrong
  });

  it('rejects short/long strings', () => {
    expect(validateCpf('1234567890')).toBe(false);   // 10 digits
    expect(validateCpf('123456789012')).toBe(false); // 12 digits
  });

  it('rejects empty string', () => {
    expect(validateCpf('')).toBe(false);
  });
});
