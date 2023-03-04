import IngPlIngbplpw from './banks/ing-pl-ingbplpw.js';
import IntegrationBank from './banks/integration-bank.js';
import MbankRetailBrexplpw from './banks/mbank-retail-brexplpw.js';
import SandboxfinanceSfin0000 from './banks/sandboxfinance-sfin0000.js';

const banks = [MbankRetailBrexplpw, SandboxfinanceSfin0000, IngPlIngbplpw];

export default (institutionId) =>
  banks.find((b) => b.institutionId === institutionId) || IntegrationBank;
