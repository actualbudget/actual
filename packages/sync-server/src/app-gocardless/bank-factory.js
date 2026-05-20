import IntegrationBank from './banks/integration-bank';

// Filename convention: <name>_<bic>.{ts,js} (skips bank.interface,
// integration-bank, and any other helper without an underscore).
const bankModules = import.meta.glob('./banks/*_*.{ts,js}', { eager: true });

export const banks = Object.values(bankModules).map(m => m.default);

export function BankFactory(institutionId) {
  return (
    banks.find(b => b.institutionIds.includes(institutionId)) || IntegrationBank
  );
}
