import BankFactory from '../bank-factory.js';
import MbankRetailBrexplpw from '../banks/mbank-retail-brexplpw.js';
import SandboxfinanceSfin0000 from '../banks/sandboxfinance-sfin0000.js';
import IngPlIngbplpw from '../banks/ing-pl-ingbplpw.js';
import IntegrationBank from '../banks/integration-bank.js';

describe('BankFactory', () => {
  it('should return MbankRetailBrexplpw when institutionId is mbank-retail-brexplpw', () => {
    const institutionId = MbankRetailBrexplpw.institutionId;
    const result = BankFactory(institutionId);

    expect(result.institutionId).toBe(institutionId);
  });

  it('should return SandboxfinanceSfin0000 when institutionId is sandboxfinance-sfin0000', () => {
    const institutionId = SandboxfinanceSfin0000.institutionId;
    const result = BankFactory(institutionId);

    expect(result.institutionId).toBe(institutionId);
  });

  it('should return IngPlIngbplpw when institutionId is ing-pl-ingbplpw', () => {
    const institutionId = IngPlIngbplpw.institutionId;
    const result = BankFactory(institutionId);

    expect(result.institutionId).toBe(institutionId);
  });

  it('should return IntegrationBank when institutionId is not found', () => {
    const institutionId = IntegrationBank.institutionId;
    const result = BankFactory(institutionId);

    expect(result.institutionId).toBe(institutionId);
  });
});
