import AmericanExpressAesudef1 from './banks/american-express-aesudef1.js';
import Belfius from './banks/belfius_gkccbebb.js';
import BnpBeGebabebb from './banks/bnp-be-gebabebb.js';
import DanskeBankDabNO22 from './banks/danskebank-dabno22.js';
import IngIngddeff from './banks/ing-ingddeff.js';
import IngPlIngbplpw from './banks/ing-pl-ingbplpw.js';
import IntegrationBank from './banks/integration-bank.js';
import MbankRetailBrexplpw from './banks/mbank-retail-brexplpw.js';
import NorwegianXxNorwnok1 from './banks/norwegian-xx-norwnok1.js';
import SEBKortBankAB from './banks/seb-kort-bank-ab.js';
import SEBPrivat from './banks/seb-privat.js';
import SandboxfinanceSfin0000 from './banks/sandboxfinance-sfin0000.js';
import SparNordSpNoDK22 from './banks/sparnord-spnodk22.js';
import SpkMarburgBiedenkopfHeladef1mar from './banks/spk-marburg-biedenkopf-heladef1mar.js';
import SpkKarlsruhekarsde66 from './banks/spk-karlsruhe-karsde66.js';

const banks = [
  AmericanExpressAesudef1,
  Belfius,
  BnpBeGebabebb,
  DanskeBankDabNO22,
  IngIngddeff,
  IngPlIngbplpw,
  MbankRetailBrexplpw,
  NorwegianXxNorwnok1,
  SEBKortBankAB,
  SEBPrivat,
  SandboxfinanceSfin0000,
  SparNordSpNoDK22,
  SpkMarburgBiedenkopfHeladef1mar,
  SpkKarlsruhekarsde66,
];

export default (institutionId) =>
  banks.find((b) => b.institutionIds.includes(institutionId)) ||
  IntegrationBank;
