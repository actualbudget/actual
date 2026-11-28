import type {
  EnableBankingAspsp,
  IEnableBankingBank,
} from './banks/bank.interface';
import IntegrationBank from './banks/integration-bank';

const bankModules = import.meta.glob<{ default: IEnableBankingBank }>(
  './banks/*_*.{ts,js}',
  {
    eager: true,
  },
);

export const banks: IEnableBankingBank[] = Object.values(bankModules).map(
  m => m.default,
);

export function BankFactory(aspsp?: EnableBankingAspsp): IEnableBankingBank {
  return banks.find(b => b.matches(aspsp)) || IntegrationBank;
}
