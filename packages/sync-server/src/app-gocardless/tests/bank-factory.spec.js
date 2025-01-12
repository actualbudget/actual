import BankFactory from '../bank-factory.js';
import { banks } from '../bank-factory.js';
import IntegrationBank from '../banks/integration-bank.js';

describe('BankFactory', () => {
  it.each(banks.flatMap((bank) => bank.institutionIds))(
    `should return same institutionId`,
    (institutionId) => {
      const result = BankFactory(institutionId);

      expect(result.institutionIds).toContain(institutionId);
    },
  );

  it('should return IntegrationBank when institutionId is not found', () => {
    const institutionId = IntegrationBank.institutionIds[0];
    const result = BankFactory('fake-id-not-found');

    expect(result.institutionIds).toContain(institutionId);
  });
});
