import type { IBank } from './banks/bank.interface';
import IntegrationBank from './banks/integration-bank';

// Filename convention: <name>_<bic>.{ts,js} (skips bank.interface,
// integration-bank, and any other helper without an underscore).
const bankModules = import.meta.glob<{ default: IBank }>(
  './banks/*_*.{ts,js}',
  {
    eager: true,
  },
);

export const banks: IBank[] = Object.values(bankModules).map(m => m.default);

export function BankFactory(institutionId: string): IBank {
  return (
    banks.find(b => b.institutionIds.includes(institutionId)) || IntegrationBank
  );
}
