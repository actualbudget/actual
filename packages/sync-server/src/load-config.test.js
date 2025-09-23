import convict from 'convict';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import the custom format
import './load-config.js';

describe('tokenExpiration format', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should accept string numbers from environment variables', () => {
    const testSchema = convict({
      token_expiration: {
        format: 'tokenExpiration',
        default: 'never',
        env: 'TEST_TOKEN_EXPIRATION',
      },
    });

    // Test string number
    process.env.TEST_TOKEN_EXPIRATION = '86400';
    testSchema.load({});
    expect(() => testSchema.validate()).not.toThrow();
    expect(testSchema.get('token_expiration')).toBe(86400);
    expect(typeof testSchema.get('token_expiration')).toBe('number');
  });

  it('should accept different string numbers', () => {
    const testSchema = convict({
      token_expiration: {
        format: 'tokenExpiration',
        default: 'never',
        env: 'TEST_TOKEN_EXPIRATION',
      },
    });

    // Test different string numbers
    const testCases = ['3600', '7200', '0'];

    for (const testValue of testCases) {
      process.env.TEST_TOKEN_EXPIRATION = testValue;
      testSchema.load({});
      expect(() => testSchema.validate()).not.toThrow();
      expect(testSchema.get('token_expiration')).toBe(Number(testValue));
      expect(typeof testSchema.get('token_expiration')).toBe('number');
    }
  });

  it('should accept special string values', () => {
    const testSchema = convict({
      token_expiration: {
        format: 'tokenExpiration',
        default: 'never',
        env: 'TEST_TOKEN_EXPIRATION',
      },
    });

    // Test 'never' value
    process.env.TEST_TOKEN_EXPIRATION = 'never';
    testSchema.load({});
    expect(() => testSchema.validate()).not.toThrow();
    expect(testSchema.get('token_expiration')).toBe('never');

    // Test 'openid-provider' value
    process.env.TEST_TOKEN_EXPIRATION = 'openid-provider';
    testSchema.load({});
    expect(() => testSchema.validate()).not.toThrow();
    expect(testSchema.get('token_expiration')).toBe('openid-provider');
  });

  it('should accept numeric values directly', () => {
    const testSchema = convict({
      token_expiration: {
        format: 'tokenExpiration',
        default: 'never',
      },
    });

    testSchema.set('token_expiration', 86400);
    expect(() => testSchema.validate()).not.toThrow();
    expect(testSchema.get('token_expiration')).toBe(86400);
  });

  it('should reject invalid string values', () => {
    const testSchema = convict({
      token_expiration: {
        format: 'tokenExpiration',
        default: 'never',
        env: 'TEST_TOKEN_EXPIRATION',
      },
    });

    // Test invalid string
    process.env.TEST_TOKEN_EXPIRATION = 'invalid';
    testSchema.load({});
    expect(() => testSchema.validate()).toThrow(
      /Invalid token_expiration value/,
    );

    // Test negative number as string
    process.env.TEST_TOKEN_EXPIRATION = '-100';
    testSchema.load({});
    expect(() => testSchema.validate()).toThrow(
      /Invalid token_expiration value/,
    );
  });
});
