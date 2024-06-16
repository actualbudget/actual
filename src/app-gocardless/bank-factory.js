import AbancaCaglesmm from './banks/abanca-caglesmm.js';
import AmericanExpressAesudef1 from './banks/american-express-aesudef1.js';
import BankinterBkbkesmm from './banks/bankinter-bkbkesmm.js';
import Belfius from './banks/belfius_gkccbebb.js';
import BnpBeGebabebb from './banks/bnp-be-gebabebb.js';
import DanskeBankDabNO22 from './banks/danskebank-dabno22.js';
import IngIngddeff from './banks/ing-ingddeff.js';
import IngPlIngbplpw from './banks/ing-pl-ingbplpw.js';
import IntegrationBank from './banks/integration-bank.js';
import MbankRetailBrexplpw from './banks/mbank-retail-brexplpw.js';
import NationwideNaiaGB21 from './banks/nationwide-naiagb21.js';
import NorwegianXxNorwnok1 from './banks/norwegian-xx-norwnok1.js';
import SEBKortBankAB from './banks/seb-kort-bank-ab.js';
import SEBPrivat from './banks/seb-privat.js';
import SandboxfinanceSfin0000 from './banks/sandboxfinance-sfin0000.js';
import SparNordSpNoDK22 from './banks/sparnord-spnodk22.js';
import SpkMarburgBiedenkopfHeladef1mar from './banks/spk-marburg-biedenkopf-heladef1mar.js';
import SpkKarlsruhekarsde66 from './banks/spk-karlsruhe-karsde66.js';
import VirginNrnbgb22 from './banks/virgin_nrnbgb22.js';

export const banks = [
  AbancaCaglesmm,
  AmericanExpressAesudef1,
  BankinterBkbkesmm,
  Belfius,
  BnpBeGebabebb,
  DanskeBankDabNO22,
  IngIngddeff,
  IngPlIngbplpw,
  MbankRetailBrexplpw,
  NationwideNaiaGB21,
  NorwegianXxNorwnok1,
  SEBKortBankAB,
  SEBPrivat,
  SandboxfinanceSfin0000,
  SparNordSpNoDK22,
  SpkMarburgBiedenkopfHeladef1mar,
  SpkKarlsruhekarsde66,
  VirginNrnbgb22,
];

export default (institutionId) =>
  banks.find((b) => b.institutionIds.includes(institutionId)) ||
  IntegrationBank;

export const BANKS_WITH_LIMITED_HISTORY = [
  'BRED_BREDFRPPXXX',
  'INDUSTRA_MULTLV2X',
  'MEDICINOSBANK_MDBALT22XXX',
  'CESKA_SPORITELNA_LONG_GIBACZPX',
  'LHV_LHVBEE22',
  'LUMINOR_NDEALT2X',
  'LUMINOR_RIKOEE22',
  'LUMINOR_AGBLLT2X',
  'LUMINOR_NDEALV2X',
  'LUMINOR_NDEAEE2X',
  'LUMINOR_RIKOLV2X',
  'SWEDBANK_HABAEE2X',
  'SWEDBANK_HABALT22',
  'SWEDBANK_HABALV22',
  'SWEDBANK_SWEDSESS',
  'SEB_CBVILT2X',
  'SEB_UNLALV2X',
  'SEB_EEUHEE2X',
  'LABORALKUTXA_CLPEES2M',
  'BANKINTER_BKBKESMM',
  'CAIXABANK_CAIXESBB',
  'JEKYLL_JEYKLL002',
  'SANTANDER_DE_SCFBDE33',
  'BBVA_BBVAESMM',
  'COOP_EKRDEE22',
  'BANCA_AIDEXA_AIDXITMM',
  'BANCA_PATRIMONI_SENVITT1',
  'BANCA_SELLA_SELBIT2B',
  'CARTALIS_CIMTITR1',
  'DOTS_HYEEIT22',
  'HYPE_BUSINESS_HYEEIT22',
  'HYPE_HYEEIT2',
  'ILLIMITY_ITTPIT2M',
  'SMARTIKA_SELBIT22',
  'TIM_HYEEIT22',
  'TOT_SELBIT2B',
  'OPYN_BITAITRRB2B',
  'PAYTIPPER_PAYTITM1',
  'SELLA_PERSONAL_CREDIT_SELBIT22',
];
