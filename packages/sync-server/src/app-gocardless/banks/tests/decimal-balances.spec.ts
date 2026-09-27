import AbnAmro from '#app-gocardless/banks/abnamro_abnanl2a';
import Cetelem from '#app-gocardless/banks/cetelem_cetmptp1xxx';
import IngPl from '#app-gocardless/banks/ing_pl_ingbplpw';
import Fallback from '#app-gocardless/banks/integration-bank';
import SebKort from '#app-gocardless/banks/seb_kort_bank_ab';
import type {
  Balance,
  Transaction,
} from '#app-gocardless/gocardless-node.types';

const transaction = (amount: string): Transaction => ({
  transactionAmount: { amount, currency: 'KWD' },
  bookingDate: '2026-01-01',
});

const balance = (
  amount: string,
  balanceType: Balance['balanceType'],
): Balance => ({
  balanceAmount: { amount, currency: 'KWD' },
  balanceType,
});

describe('GoCardless decimal starting balances', () => {
  it('subtracts fallback transactions exactly before destination rounding', () => {
    expect(
      Fallback.calculateStartingBalance(
        [transaction('0.002'), transaction('-0.003')],
        [balance('1000.001', 'closingBooked')],
      ),
    ).toBe('1000.002');
    expect(Fallback.calculateStartingBalance([], [])).toBe('0');
  });

  it.each([AbnAmro, IngPl])(
    'uses the oldest transaction balance without subtracting the whole batch',
    bank => {
      const oldest = {
        ...transaction('0.005'),
        balanceAfterTransaction: balance('1.234', 'interimBooked'),
      };
      expect(
        bank.calculateStartingBalance(
          [transaction('100.000'), oldest],
          [balance('999.000', 'interimBooked')],
        ),
      ).toBe('1.229');
      expect(
        bank.calculateStartingBalance([], [balance('1.234', 'interimBooked')]),
      ).toBe('1.234');
    },
  );

  it('keeps the SEB credit balance rule at three decimal places', () => {
    expect(
      SebKort.calculateStartingBalance(
        [transaction('1.002'), transaction('-0.003')],
        [balance('20.001', 'expected'), balance('100.000', 'nonInvoiced')],
      ),
    ).toBe('79.000');
  });

  it.each([Cetelem, SebKort])('flips credit transaction text exactly', bank => {
    const normalized = bank.normalizeTransaction(
      transaction('0.000000000000001'),
      true,
    );
    expect(normalized?.transactionAmount.amount).toBe('-0.000000000000001');
  });
});
