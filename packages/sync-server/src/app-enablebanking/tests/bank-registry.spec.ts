import { describe, expect, it } from 'vitest';

import { DanishBankProcessor } from '../banks/danish.bank.js';
import { FallbackBankProcessor } from '../banks/fallback.bank.js';
import { BankProcessorFor, getLoadedRegistry } from '../banks/bank-registry.js';
import { type BankProcessor } from '../models/bank-processor.js';

describe('Bank Registry', () => {
  describe('ProcessorRegistry', () => {
    it('should return FallbackBankProcessor for unknown bank ID', async () => {
      const registry = await getLoadedRegistry();
      const processor = registry.get('unknown-bank-id');

      expect(processor).toBeInstanceOf(FallbackBankProcessor);
      expect(processor.name).toBe('FallbackBankProcessor');
    });

    it('should return Danish processor for Danish bank IDs', async () => {
      const registry = await getLoadedRegistry();
      // Test one of the Danish bank IDs that's actually registered
      const processor = registry.get('DK_Danske Bank');

      expect(processor).toBeInstanceOf(DanishBankProcessor);
      expect(processor.name).toBe('DanishBankProcessor');
    });

    it('should list all registered bank IDs', async () => {
      const registry = await getLoadedRegistry();
      const ids = registry.list();

      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
      // Should include at least one Danish bank
      expect(ids.some((id) => id.startsWith('DK_'))).toBe(true);
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

      // Should return new instances but same type
      expect(processor1).toBeInstanceOf(DanishBankProcessor);
      expect(processor2).toBeInstanceOf(DanishBankProcessor);
      expect(processor1).not.toBe(processor2); // Different instances
    });
  });

  describe('BankProcessorFor Decorator', () => {
    it('should register processor for multiple bank IDs', async () => {
      const registry = await getLoadedRegistry();
      // Use unique IDs to prevent conflicts with other tests
      const uniqueId = `test-${Date.now()}`;
      const testIds = [
        `${uniqueId}-bank-1`,
        `${uniqueId}-bank-2`,
        `${uniqueId}-bank-3`,
      ];

      // Create a test processor
      @BankProcessorFor(testIds)
      class TestBankProcessor extends FallbackBankProcessor {
        override name = 'TestBankProcessor';
      }

      const processor1 = registry.get(testIds[0]);
      const processor2 = registry.get(testIds[1]);
      const processor3 = registry.get(testIds[2]);

      expect(processor1.name).toBe('TestBankProcessor');
      expect(processor2.name).toBe('TestBankProcessor');
      expect(processor3.name).toBe('TestBankProcessor');
    });

    it('should allow processors to extend FallbackBankProcessor', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `custom-${Date.now()}`;

      @BankProcessorFor([uniqueId])
      class CustomProcessor extends FallbackBankProcessor {
        override name = 'CustomProcessor';
      }

      const processor = registry.get(uniqueId);

      expect(processor).toBeInstanceOf(FallbackBankProcessor);
      expect(processor).toBeInstanceOf(CustomProcessor);
    });
  });

  describe('Security Validation', () => {
    it('should return fallback for non-function constructors', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `invalid-${Date.now()}`;
      // Manually register an invalid constructor
      const invalidCtor = 'not-a-function' as any;
      registry['map'].set(uniqueId, invalidCtor);

      const processor = registry.get(uniqueId);

      expect(processor).toBeInstanceOf(FallbackBankProcessor);
    });

    it('should return fallback if constructor throws during instantiation', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `throwing-${Date.now()}`;

      class ThrowingProcessor extends FallbackBankProcessor {
        constructor() {
          super();
          throw new Error('Constructor error');
        }
      }

      registry.register(uniqueId, ThrowingProcessor);
      const processor = registry.get(uniqueId);

      expect(processor).toBeInstanceOf(FallbackBankProcessor);
      expect(processor).not.toBeInstanceOf(ThrowingProcessor);
    });

    it('should reject processors that do not extend FallbackBankProcessor', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `invalid-processor-${Date.now()}`;
      // Create a class that doesn't extend FallbackBankProcessor
      class InvalidProcessor implements BankProcessor {
        debug = false;
        name = 'InvalidProcessor';
        normalizeTransaction(t: any) {
          return t;
        }
      }

      registry['map'].set(uniqueId, InvalidProcessor as any);
      const processor = registry.get(uniqueId);

      // Should return fallback instead
      expect(processor).toBeInstanceOf(FallbackBankProcessor);
      expect(processor.name).toBe('FallbackBankProcessor');
    });

    it('should allow FallbackBankProcessor itself to be registered', async () => {
      const registry = await getLoadedRegistry();
      const uniqueId = `fallback-test-${Date.now()}`;

      registry.register(uniqueId, FallbackBankProcessor);
      const processor = registry.get(uniqueId);

      expect(processor).toBeInstanceOf(FallbackBankProcessor);
      expect(processor.name).toBe('FallbackBankProcessor');
    });
  });

  describe('Error Handling', () => {
    it('should throw error on duplicate registration', () => {
      const uniqueId = `duplicate-test-${Date.now()}`;

      @BankProcessorFor([uniqueId])
      class FirstProcessor extends FallbackBankProcessor {}

      expect(() => {
        @BankProcessorFor([uniqueId])
        class SecondProcessor extends FallbackBankProcessor {}
      }).toThrow('Duplicate bank processor id');
    });
  });

  describe('Real Bank IDs', () => {
    it('should have processors for major Danish banks', async () => {
      const registry = await getLoadedRegistry();
      const danishBanks = [
        'DK_Danske Bank',
        'DK_Nordea',
        'DK_Jyske Bank',
      ];

      danishBanks.forEach((bankId) => {
        const processor = registry.get(bankId);
        expect(processor).toBeInstanceOf(DanishBankProcessor);
      });
    });

    it('should return fallback for non-Danish European banks', async () => {
      const registry = await getLoadedRegistry();
      // These should use fallback processor
      const otherBanks = ['SomeBank_SE_TESTXXXX', 'AnotherBank_NO_TESTXXXX'];

      otherBanks.forEach((bankId) => {
        const processor = registry.get(bankId);
        expect(processor).toBeInstanceOf(FallbackBankProcessor);
        expect(processor.name).toBe('FallbackBankProcessor');
      });
    });
  });
});
