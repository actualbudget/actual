import { describe, expect, it } from 'vitest';

import { getLoadedRegistry } from '../banks/bank-registry.js';
import { createFallbackBankProcessor } from '../banks/fallback.bank.js';
import type { BankProcessor } from '../models/bank-processor.js';

describe('Bank Registry', () => {
  describe('ProcessorRegistry', () => {
    it('should return FallbackBankProcessor for unknown bank ID', async () => {
      const registry = await getLoadedRegistry();
      const processor = registry.get('unknown-bank-id');

      expect(processor.name).toBe('FallbackBankProcessor');
    });

    it('should return Danish processor for Danish bank IDs', async () => {
      const registry = await getLoadedRegistry();
      // Test one of the Danish bank IDs that's actually registered
      const processor = registry.get('DK_Danske Bank');

      expect(processor.name).toBe('DanishBankProcessor');
    });

    it('should list all registered bank IDs', async () => {
      const registry = await getLoadedRegistry();
      const ids = registry.list();

      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
      // Should include at least one Danish bank
      expect(ids.some(id => id.startsWith('DK_'))).toBe(true);
    });

    it('should return sorted list of bank IDs', async () => {
      const registry = await getLoadedRegistry();
      const ids = registry.list();

      const sorted = [...ids].sort();
      expect(ids).toEqual(sorted);
    });

    it('should handle multiple requests for same bank ID consistently', async () => {
      const registry = await getLoadedRegistry();
      const processor1 = registry.get('DK_Danske Bank');
      const processor2 = registry.get('DK_Danske Bank');

      expect(processor1.name).toBe('DanishBankProcessor');
      expect(processor2.name).toBe('DanishBankProcessor');
      expect(processor1).not.toBe(processor2);
    });
  });

  describe('Processor registration', () => {
    it('should register processor for multiple bank IDs', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `test-${Date.now()}`;
      const testIds = [
        `${uniqueId}-bank-1`,
        `${uniqueId}-bank-2`,
        `${uniqueId}-bank-3`,
      ];

      const createTestProcessor = (): BankProcessor => ({
        debug: false,
        name: 'TestBankProcessor',
        normalizeTransaction: transaction =>
          createFallbackBankProcessor().normalizeTransaction(transaction),
      });

      registry.registerForBanks(testIds, createTestProcessor);

      const processor1 = registry.get(testIds[0]);
      const processor2 = registry.get(testIds[1]);
      const processor3 = registry.get(testIds[2]);

      expect(processor1.name).toBe('TestBankProcessor');
      expect(processor2.name).toBe('TestBankProcessor');
      expect(processor3.name).toBe('TestBankProcessor');
    });

    it('should accept valid processor factories', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `custom-${Date.now()}`;

      registry.register(uniqueId, () => ({
        ...createFallbackBankProcessor(),
        name: 'CustomProcessor',
      }));

      const processor = registry.get(uniqueId);

      expect(processor.name).toBe('CustomProcessor');
    });
  });

  describe('Security Validation', () => {
    it('should return fallback for non-function factories', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `invalid-${Date.now()}`;
      const invalidFactory = 'not-a-function';
      // @ts-expect-error Testing runtime protection for invalid factory input
      registry.register(uniqueId, invalidFactory);

      const processor = registry.get(uniqueId);

      expect(processor.name).toBe('FallbackBankProcessor');
    });

    it('should return fallback if factory throws', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `throwing-${Date.now()}`;

      registry.register(uniqueId, () => {
        throw new Error('Factory error');
      });
      const processor = registry.get(uniqueId);

      expect(processor.name).toBe('FallbackBankProcessor');
    });

    it('should reject invalid processor objects from factory', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `invalid-output-${Date.now()}`;

      registry.register(
        uniqueId,
        () =>
          ({
            name: 'InvalidProcessor',
          }) as unknown as BankProcessor,
      );
      const processor = registry.get(uniqueId);

      expect(processor.name).toBe('FallbackBankProcessor');
    });

    it('should allow fallback processor factory to be registered', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `fallback-test-${Date.now()}`;

      registry.register(uniqueId, createFallbackBankProcessor);
      const processor = registry.get(uniqueId);

      expect(processor.name).toBe('FallbackBankProcessor');
    });
  });

  describe('Error Handling', () => {
    it('should throw error on duplicate registration', () => {
      const registryPromise = getLoadedRegistry();
      const uniqueId = `duplicate-test-${Date.now()}`;

      return registryPromise.then(registry => {
        registry.register(uniqueId, createFallbackBankProcessor);
        expect(() => {
          registry.register(uniqueId, createFallbackBankProcessor);
        }).toThrow('Duplicate bank processor id');
      });
    });
  });

  describe('Real Bank IDs', () => {
    it('should have processors for major Danish banks', async () => {
      const registry = await getLoadedRegistry();
      const danishBanks = ['DK_Danske Bank', 'DK_Nordea', 'DK_Jyske Bank'];

      danishBanks.forEach(bankId => {
        const processor = registry.get(bankId);
        expect(processor.name).toBe('DanishBankProcessor');
      });
    });

    it('should return fallback for unregistered bank IDs with non-Danish prefixes', async () => {
      const registry = await getLoadedRegistry();
      // These should use fallback processor
      const otherBanks = ['SomeBank_SE_TESTXXXX', 'AnotherBank_NO_TESTXXXX'];

      otherBanks.forEach(bankId => {
        const processor = registry.get(bankId);
        expect(processor.name).toBe('FallbackBankProcessor');
      });
    });
  });
});
