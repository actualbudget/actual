import { expect } from '@jest/globals';
import { extractFileExtension, parseFile } from '../src';

describe('parseFile', () => {
  it('csv import works', async () => {
    const filePath = __dirname + '/data/data.csv';
    const { errors, transactions } = await parseFile(filePath, {
      delimiter: ',',
      singleAmountField: false,
      headings: {
        deposit: 'Credit Amount',
        payment: 'Debit Amount',
        date: 'Transaction Date',
        payee_name: 'Transaction Description',
        imported_payee: 'Transaction Description',
        notes: '',
      },
    });
    expect(errors.length).toBe(0);
    expect(transactions).toMatchSnapshot();
  });

  it('qif import works', async () => {
    const filePath = __dirname + '/data/data.qif';
    const { errors, transactions } = await parseFile(filePath);
    expect(errors.length).toBe(0);
    expect(transactions).toMatchSnapshot();
  });

  it('ofx import works', async () => {
    const filePath = __dirname + '/data/data.ofx';
    const { errors, transactions } = await parseFile(filePath);
    expect(errors.length).toBe(0);
    expect(transactions).toMatchSnapshot();
  }, 45000);

  it('qfx import works', async () => {
    const filePath = __dirname + '/data/data.qfx';
    const { errors, transactions } = await parseFile(filePath);
    expect(errors.length).toBe(0);
    expect(transactions).toMatchSnapshot();
  }, 45000);

  it('unsupported file type import fails', async () => {
    const filePath = __dirname + '/data/foo.txt';
    const { errors, transactions } = await parseFile(filePath);

    expect(errors.length).toBe(1);
    expect(errors[0].message).toBe('Invalid file type');
    expect(transactions.length).toBe(0);
  }, 45000);
});

describe('extractFileExtension', () => {
  it('matches extensions correctly (case-insensitive, etc)', () => {
    expect(extractFileExtension(__dirname + '/data/best.data-ever$.QFX')).toBe('.qfx');
    expect(extractFileExtension(__dirname + '/data/big.data.QiF')).toBe('.qif');

    // Unsupported filetype
    expect(extractFileExtension(__dirname + '/foo')).toBe(null);
  });

  it('returns null for invalid inputs', () => {
    expect(extractFileExtension(__dirname + '/foo')).toBe(null);
    expect(extractFileExtension('100')).toBe(null);
    expect(extractFileExtension(null)).toBe(null);
    expect(extractFileExtension(undefined)).toBe(null);
  });
});
