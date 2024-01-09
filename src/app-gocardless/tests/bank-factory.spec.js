import BankFactory from '../bank-factory.js';
import MbankRetailBrexplpw from '../banks/mbank-retail-brexplpw.js';
import SandboxfinanceSfin0000 from '../banks/sandboxfinance-sfin0000.js';
import IngPlIngbplpw from '../banks/ing-pl-ingbplpw.js';
import IntegrationBank from '../banks/integration-bank.js';
import Belfius from '../banks/belfius_gkccbebb.js';
import SpkMarburgBiedenkopfHeladef1mar from '../banks/spk-marburg-biedenkopf-heladef1mar.js';

describe('BankFactory', () => {
  it('should return MbankRetailBrexplpw when institutionId is mbank-retail-brexplpw', () => {
    const institutionId = MbankRetailBrexplpw.institutionIds[0];
    const result = BankFactory(institutionId);

    expect(result.institutionIds).toContain(institutionId);
  });

  it('should return SandboxfinanceSfin0000 when institutionId is sandboxfinance-sfin0000', () => {
    const institutionId = SandboxfinanceSfin0000.institutionIds[0];
    const result = BankFactory(institutionId);

    expect(result.institutionIds).toContain(institutionId);
  });

  it('should return IngPlIngbplpw when institutionId is ing-pl-ingbplpw', () => {
    const institutionId = IngPlIngbplpw.institutionIds[0];
    const result = BankFactory(institutionId);

    expect(result.institutionIds).toContain(institutionId);
  });

  it('should return SpkMarburgBiedenkopfHeladef1mar when institutionId is SPK_MARBURG_BIEDENKOPF_HELADEF1MAR', () => {
    const institutionId = SpkMarburgBiedenkopfHeladef1mar.institutionIds[0];
    const result = BankFactory(institutionId);

    expect(result.institutionIds).toContain(institutionId);
  });

  it('should return Belfius when institutionId is BELFIUS_GKCCBEBB', () => {
    const institutionId = Belfius.institutionIds[0];
    const result = BankFactory(institutionId);

    expect(result.institutionIds).toContain(institutionId);
  });

  it('should return IntegrationBank when institutionId is not found', () => {
    const institutionId = IntegrationBank.institutionIds[0];
    const result = BankFactory(institutionId);

    expect(result.institutionIds).toContain(institutionId);
  });
});
