import { describe, expect, it } from 'vitest';

import { parseWallosFile, toRecurConfig } from './wallos';

// Sample data based on actual Wallos export format
const sampleWallosExport = [
  {
    Name: 'Lovevery',
    'Payment Cycle': 'Every 3 Months',
    'Next Payment': '2026-03-12',
    Renewal: 'Automatic',
    Category: 'Education',
    'Payment Method': 'Credit Card',
    'Paid By': 'username',
    Price: '$151.46',
    Notes: '',
    URL: '',
    State: 'Enabled',
    Notifications: 'Disabled',
    'Cancellation Date': '',
    Active: 'Yes',
  },
  {
    Name: 'Bitwarden',
    'Payment Cycle': 'Yearly',
    'Next Payment': '2027-01-01',
    Renewal: 'Automatic',
    Category: 'Cloud Services',
    'Payment Method': 'Credit Card',
    'Paid By': 'username',
    Price: '$10',
    Notes: 'Synchrony MC',
    URL: '',
    State: 'Enabled',
    Notifications: 'Disabled',
    'Cancellation Date': '',
    Active: 'Yes',
  },
  {
    Name: 'Financial Planner',
    'Payment Cycle': 'Monthly',
    'Next Payment': '2026-02-01',
    Renewal: 'Automatic',
    Category: 'Banking',
    'Payment Method': 'Credit Card',
    'Paid By': 'username',
    Price: '$250',
    Notes: '',
    URL: '',
    State: 'Enabled',
    Notifications: 'Disabled',
    'Cancellation Date': '',
    Active: 'Yes',
  },
  {
    Name: 'FastMail',
    'Payment Cycle': 'Every 3 Years',
    'Next Payment': '2028-01-06',
    Renewal: 'Automatic',
    Category: 'Cloud Services',
    'Payment Method': 'Credit Card',
    'Paid By': 'username',
    Price: '$280',
    Notes: '',
    URL: '',
    State: 'Enabled',
    Notifications: 'Disabled',
    'Cancellation Date': '',
    Active: 'Yes',
  },
  {
    Name: 'Disabled Service',
    'Payment Cycle': 'Monthly',
    'Next Payment': '2026-01-01',
    Renewal: 'Automatic',
    Category: 'Test',
    'Payment Method': 'Credit Card',
    'Paid By': 'username',
    Price: '€50.00',
    Notes: '',
    URL: '',
    State: 'Disabled',
    Notifications: 'Disabled',
    'Cancellation Date': '',
    Active: 'No',
  },
];

describe('Wallos importer', () => {
  describe('parseWallosFile', () => {
    it('parses plain array format', () => {
      const content = JSON.stringify(sampleWallosExport);
      const result = parseWallosFile(content);

      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('Lovevery');
      expect(result[1].name).toBe('Bitwarden');
    });

    it('parses wrapped format with success flag', () => {
      const wrapped = {
        success: true,
        subscriptions: sampleWallosExport.slice(0, 2),
      };
      const content = JSON.stringify(wrapped);
      const result = parseWallosFile(content);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Lovevery');
    });

    it('throws error for invalid format', () => {
      const invalid = { foo: 'bar' };
      const content = JSON.stringify(invalid);

      expect(() => parseWallosFile(content)).toThrow('Invalid Wallos export');
    });

    it('parses monthly subscription correctly', () => {
      const content = JSON.stringify([sampleWallosExport[2]]);
      const [result] = parseWallosFile(content);

      expect(result.name).toBe('Financial Planner');
      expect(result.frequency).toBe('monthly');
      expect(result.interval).toBe(1);
      expect(result.amount).toBe(-25000); // $250 in cents, negative
      expect(result.nextPaymentDate).toBe('2026-02-01');
      expect(result.isActive).toBe(true);
    });

    it('parses yearly subscription correctly', () => {
      const content = JSON.stringify([sampleWallosExport[1]]);
      const [result] = parseWallosFile(content);

      expect(result.name).toBe('Bitwarden');
      expect(result.frequency).toBe('yearly');
      expect(result.interval).toBe(1);
      expect(result.amount).toBe(-1000); // $10 in cents
    });

    it('parses "Every 3 Months" cycle correctly', () => {
      const content = JSON.stringify([sampleWallosExport[0]]);
      const [result] = parseWallosFile(content);

      expect(result.name).toBe('Lovevery');
      expect(result.frequency).toBe('monthly');
      expect(result.interval).toBe(3);
      expect(result.amount).toBe(-15146); // $151.46 in cents
    });

    it('parses "Every 3 Years" cycle correctly', () => {
      const content = JSON.stringify([sampleWallosExport[3]]);
      const [result] = parseWallosFile(content);

      expect(result.name).toBe('FastMail');
      expect(result.frequency).toBe('yearly');
      expect(result.interval).toBe(3);
      expect(result.amount).toBe(-28000); // $280 in cents
    });

    it('parses Euro currency correctly', () => {
      const content = JSON.stringify([sampleWallosExport[4]]);
      const [result] = parseWallosFile(content);

      expect(result.amount).toBe(-5000); // €50 in cents
    });

    it('marks disabled subscriptions as inactive', () => {
      const content = JSON.stringify([sampleWallosExport[4]]);
      const [result] = parseWallosFile(content);

      expect(result.isActive).toBe(false);
    });

    it('preserves original price string', () => {
      const content = JSON.stringify([sampleWallosExport[0]]);
      const [result] = parseWallosFile(content);

      expect(result.originalPrice).toBe('$151.46');
    });
  });

  describe('toRecurConfig', () => {
    it('creates correct RecurConfig for monthly subscription', () => {
      const content = JSON.stringify([sampleWallosExport[2]]);
      const [parsed] = parseWallosFile(content);
      const config = toRecurConfig(parsed);

      expect(config).toEqual({
        frequency: 'monthly',
        interval: 1,
        start: '2026-02-01',
        endMode: 'never',
      });
    });

    it('creates correct RecurConfig for quarterly subscription', () => {
      const content = JSON.stringify([sampleWallosExport[0]]);
      const [parsed] = parseWallosFile(content);
      const config = toRecurConfig(parsed);

      expect(config).toEqual({
        frequency: 'monthly',
        interval: 3,
        start: '2026-03-12',
        endMode: 'never',
      });
    });

    it('creates correct RecurConfig for multi-year subscription', () => {
      const content = JSON.stringify([sampleWallosExport[3]]);
      const [parsed] = parseWallosFile(content);
      const config = toRecurConfig(parsed);

      expect(config).toEqual({
        frequency: 'yearly',
        interval: 3,
        start: '2028-01-06',
        endMode: 'never',
      });
    });
  });
});
