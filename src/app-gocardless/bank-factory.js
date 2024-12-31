import AbancaCaglesmm from './banks/abanca-caglesmm.js';
import AbnamroAbnanl2a from './banks/abnamro_abnanl2a.js';
import AmericanExpressAesudef1 from './banks/american-express-aesudef1.js';
import BancsabadellBsabesbb from './banks/bancsabadell-bsabesbbb.js';
import BankinterBkbkesmm from './banks/bankinter-bkbkesmm.js';
import Belfius from './banks/belfius_gkccbebb.js';
import Berliner_Sparkasse_beladebexxx from './banks/berliner_sparkasse_beladebexxx.js';
import BnpBeGebabebb from './banks/bnp-be-gebabebb.js';
import CBCcregbebb from './banks/cbc_cregbebb.js';
import DanskeBankDabNO22 from './banks/danskebank-dabno22.js';
import EasybankBawaatww from './banks/easybank-bawaatww.js';
import EntercardSwednokk from './banks/entercard-swednokk.js';
import Fortuneo from './banks/FORTUNEO_FTNOFRP1XXX.js';
import HanseaticBank from './banks/HANSEATIC_HSTBDEHH.js';
import Hype_HYEEIT22 from './banks/hype_hyeeit22.js';
import IngIngbrobu from './banks/ing-ingbrobu.js';
import IngIngddeff from './banks/ing-ingddeff.js';
import IngPlIngbplpw from './banks/ing-pl-ingbplpw.js';
import IntegrationBank from './banks/integration-bank.js';
import IsyBankItbbitmm from './banks/isybank-itbbitmm.js';
import KBCkredbebb from './banks/kbc_kredbebb.js';
import MbankRetailBrexplpw from './banks/mbank-retail-brexplpw.js';
import NationwideNaiaGB21 from './banks/nationwide-naiagb21.js';
import NbgEthngraaxxx from './banks/nbg_ethngraaxxx.js';
import NorwegianXxNorwnok1 from './banks/norwegian-xx-norwnok1.js';
import RevolutRevolt21 from './banks/revolut_revolt21.js';
import SEBKortBankAB from './banks/seb-kort-bank-ab.js';
import SEBPrivat from './banks/seb-privat.js';
import SandboxfinanceSfin0000 from './banks/sandboxfinance-sfin0000.js';
import SparNordSpNoDK22 from './banks/sparnord-spnodk22.js';
import SpkKarlsruhekarsde66 from './banks/spk-karlsruhe-karsde66.js';
import SpkMarburgBiedenkopfHeladef1mar from './banks/spk-marburg-biedenkopf-heladef1mar.js';
import SpkWormsAlzeyRiedMalade51wor from './banks/spk-worms-alzey-ried-malade51wor.js';
import SwedbankHabaLV22 from './banks/swedbank-habalv22.js';
import VirginNrnbgb22 from './banks/virgin_nrnbgb22.js';

export const banks = [
  AbancaCaglesmm,
  AbnamroAbnanl2a,
  AmericanExpressAesudef1,
  BancsabadellBsabesbb,
  BankinterBkbkesmm,
  Belfius,
  Berliner_Sparkasse_beladebexxx,
  BnpBeGebabebb,
  CBCcregbebb,
  DanskeBankDabNO22,
  EasybankBawaatww,
  EntercardSwednokk,
  Fortuneo,
  HanseaticBank,
  Hype_HYEEIT22,
  IngIngbrobu,
  IngIngddeff,
  IngPlIngbplpw,
  IsyBankItbbitmm,
  KBCkredbebb,
  MbankRetailBrexplpw,
  NationwideNaiaGB21,
  NbgEthngraaxxx,
  NorwegianXxNorwnok1,
  RevolutRevolt21,
  SEBKortBankAB,
  SEBPrivat,
  SandboxfinanceSfin0000,
  SparNordSpNoDK22,
  SpkKarlsruhekarsde66,
  SpkMarburgBiedenkopfHeladef1mar,
  SpkWormsAlzeyRiedMalade51wor,
  SwedbankHabaLV22,
  VirginNrnbgb22,
];

export default (institutionId) =>
  banks.find((b) => b.institutionIds.includes(institutionId)) ||
  IntegrationBank;

export const BANKS_WITH_LIMITED_HISTORY = [
  'BANCA_AIDEXA_AIDXITMM',
  'BANCA_PATRIMONI_SENVITT1',
  'BANCA_SELLA_SELBIT2B',
  'BANKINTER_BKBKESMM',
  'BBVA_BBVAESMM',
  'BRED_BREDFRPPXXX',
  'CAIXABANK_CAIXESBB',
  'CARTALIS_CIMTITR1',
  'CESKA_SPORITELNA_LONG_GIBACZPX',
  'COOP_EKRDEE22',
  'DKB_BYLADEM1',
  'DOTS_HYEEIT22',
  'FINECO_FEBIITM2XXX',
  'FINECO_UK_FEBIITM2XXX',
  'FORTUNEO_FTNOFRP1XXX',
  'HYPE_BUSINESS_HYEEIT22',
  'HYPE_HYEEIT22',
  'ILLIMITY_ITTPIT2M',
  'INDUSTRA_MULTLV2X',
  'JEKYLL_JEYKLL002',
  'LABORALKUTXA_CLPEES2M',
  'LHV_LHVBEE22',
  'LUMINOR_AGBLLT2X',
  'LUMINOR_NDEAEE2X',
  'LUMINOR_NDEALT2X',
  'LUMINOR_NDEALV2X',
  'LUMINOR_RIKOEE22',
  'LUMINOR_RIKOLV2X',
  'MEDICINOSBANK_MDBALT22XXX',
  'NORDEA_NDEADKKK',
  'N26_NTSBDEB1',
  'OPYN_BITAITRRB2B',
  'PAYTIPPER_PAYTITM1',
  'REVOLUT_REVOLT21',
  'SANTANDER_BSCHESMM',
  'SANTANDER_DE_SCFBDE33',
  'SEB_CBVILT2X',
  'SEB_EEUHEE2X',
  'SEB_UNLALV2X',
  'SELLA_PERSONAL_CREDIT_SELBIT22',
  'BANCOACTIVOBANK_ACTVPTPL',
  'SMARTIKA_SELBIT22',
  'SWEDBANK_HABAEE2X',
  'SWEDBANK_HABALT22',
  'SWEDBANK_HABALV22',
  'SWEDBANK_SWEDSESS',
  'TIM_HYEEIT22',
  'TOT_SELBIT2B',
  'VUB_BANKA_SUBASKBX',
];
