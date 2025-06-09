import { describe, expect, test } from 'vitest';
import { hash } from '../hash';
import { createHash } from 'node:crypto';
import { bytesToHex } from '@noble/curves/abstract/utils';

describe('Hash', () => {
  (process.env.npm_lifecycle_event === 'test:browser' ? test.skip : test)(
    'sha256 - string',
    () => {
      const data = 'test';
      const hashdata = hash(data, 'sha-256');
      const hashdata2 = createHash('sha256').update(data).digest();
      expect(bytesToHex(hashdata)).toEqual(bytesToHex(hashdata2));
    },
  );

  (process.env.npm_lifecycle_event === 'test:browser' ? test.skip : test)(
    'sha256 - arraybuffer',
    () => {
      const data = new TextEncoder().encode('test');
      const hashdata = hash(data, 'sha-256');
      const hashdata2 = createHash('sha256').update(data).digest();
      expect(bytesToHex(hashdata)).toEqual(bytesToHex(hashdata2));
    },
  );

  (process.env.npm_lifecycle_event === 'test:browser' ? test.skip : test)(
    'sha-384 - string',
    () => {
      const data = 'test';
      const hashdata = hash(data, 'sha-384');
      const hashdata2 = createHash('sha384').update(data).digest();
      expect(bytesToHex(hashdata)).toEqual(bytesToHex(hashdata2));
    },
  );

  (process.env.npm_lifecycle_event === 'test:browser' ? test.skip : test)(
    'sha-384 - arraybuffer',
    () => {
      const data = new TextEncoder().encode('test');
      const hashdata = hash(data, 'sha-384');
      const hashdata2 = createHash('sha384').update(data).digest();
      expect(bytesToHex(hashdata)).toEqual(bytesToHex(hashdata2));
    },
  );

  (process.env.npm_lifecycle_event === 'test:browser' ? test.skip : test)(
    'sha-512 - string',
    () => {
      const data = 'test';
      const hashdata = hash(data, 'sha-512');
      const hashdata2 = createHash('sha512').update(data).digest();
      expect(bytesToHex(hashdata)).toEqual(bytesToHex(hashdata2));
    },
  );

  (process.env.npm_lifecycle_event === 'test:browser' ? test.skip : test)(
    'sha-512 - arraybuffer',
    () => {
      const data = new TextEncoder().encode('test');
      const hashdata = hash(data, 'sha-512');
      const hashdata2 = createHash('sha512').update(data).digest();
      expect(bytesToHex(hashdata)).toEqual(bytesToHex(hashdata2));
    },
  );
});
