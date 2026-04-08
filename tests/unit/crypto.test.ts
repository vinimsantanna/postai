import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt, maskCpf, normalizeCpf } from '@/lib/crypto';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 chars
});

describe('encrypt / decrypt', () => {
  it('roundtrips a string', () => {
    const plain = '11144477735';
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it('produces different ciphertext each call (random IV)', () => {
    const a = encrypt('same');
    const b = encrypt('same');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('same');
    expect(decrypt(b)).toBe('same');
  });

  it('throws on invalid ciphertext format', () => {
    expect(() => decrypt('not-valid')).toThrow();
  });
});

describe('maskCpf', () => {
  it('formats 11 digits as CPF', () => {
    expect(maskCpf('11144477735')).toBe('111.444.777-35');
  });

  it('throws on invalid length', () => {
    expect(() => maskCpf('123')).toThrow();
  });
});

describe('normalizeCpf', () => {
  it('strips non-digits', () => {
    expect(normalizeCpf('111.444.777-35')).toBe('11144477735');
  });

  it('leaves digits unchanged', () => {
    expect(normalizeCpf('11144477735')).toBe('11144477735');
  });
});
