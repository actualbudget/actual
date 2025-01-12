import AbancaCaglesmm from './banks/abanca_caglesmm.js';
import AbnamroAbnanl2a from './banks/abnamro_abnanl2a.js';
import AmericanExpressAesudef1 from './banks/american_express_aesudef1.js';
import BancsabadellBsabesbb from './banks/bancsabadell_bsabesbbb.js';
import BankinterBkbkesmm from './banks/bankinter_bkbkesmm.js';
import BankOfIrelandB365Bofiie2d from './banks/bank_of_ireland_b365_bofiie2d.js';
import BelfiusGkccbebb from './banks/belfius_gkccbebb.js';
import BerlinerSparkasseBeladebexxx from './banks/berliner_sparkasse_beladebexxx.js';
import BnpBeGebabebb from './banks/bnp_be_gebabebb.js';
import CbcCregbebb from './banks/cbc_cregbebb.js';
import DanskebankDabno22 from './banks/danskebank_dabno22.js';
import EasybankBawaatww from './banks/easybank_bawaatww.js';
import EntercardSwednokk from './banks/entercard_swednokk.js';
import FortuneoFtnofrp1xxx from './banks/fortuneo_ftnofrp1xxx.js';
import HanseaticHstbdehh from './banks/hanseatic_hstbdehh.js';
import HypeHyeeit22 from './banks/hype_hyeeit22.js';
import IngIngbrobu from './banks/ing_ingbrobu.js';
import IngIngddeff from './banks/ing_ingddeff.js';
import IngPlIngbplpw from './banks/ing_pl_ingbplpw.js';
import IntegrationBank from './banks/integration-bank.js';
import IsyBankItbbitmm from './banks/isybank_itbbitmm.js';
import KbcKredbebb from './banks/kbc_kredbebb.js';
import MbankRetailBrexplpw from './banks/mbank_retail_brexplpw.js';
import NationwideNaiagb21 from './banks/nationwide_naiagb21.js';
import NbgEthngraaxxx from './banks/nbg_ethngraaxxx.js';
import NorwegianXxNorwnok1 from './banks/norwegian_xx_norwnok1.js';
import RevolutRevolt21 from './banks/revolut_revolt21.js';
import SebKortBankAb from './banks/seb_kort_bank_ab.js';
import SebPrivat from './banks/seb_privat.js';
import SandboxfinanceSfin0000 from './banks/sandboxfinance_sfin0000.js';
import SparnordSpnodk22 from './banks/sparnord_spnodk22.js';
import SpkKarlsruheKarsde66 from './banks/spk_karlsruhe_karsde66.js';
import SpkMarburgBiedenkopfHeladef1mar from './banks/spk_marburg_biedenkopf_heladef1mar.js';
import SpkWormsAlzeyRiedMalade51wor from './banks/spk_worms_alzey_ried_malade51wor.js';
import SskDusseldorfDussdeddxxx from './banks/ssk_dusseldorf_dussdeddxxx.js';
import SwedbankHabalv22 from './banks/swedbank_habalv22.js';
import VirginNrnbgb22 from './banks/virgin_nrnbgb22.js';

export const banks = [
  AbancaCaglesmm,
  AbnamroAbnanl2a,
  AmericanExpressAesudef1,
  BancsabadellBsabesbb,
  BankinterBkbkesmm,
  BankOfIrelandB365Bofiie2d,
  BelfiusGkccbebb,
  BerlinerSparkasseBeladebexxx,
  BnpBeGebabebb,
  CbcCregbebb,
  DanskebankDabno22,
  EasybankBawaatww,
  EntercardSwednokk,
  FortuneoFtnofrp1xxx,
  HanseaticHstbdehh,
  HypeHyeeit22,
  IngIngbrobu,
  IngIngddeff,
  IngPlIngbplpw,
  IsyBankItbbitmm,
  KbcKredbebb,
  MbankRetailBrexplpw,
  NationwideNaiagb21,
  NbgEthngraaxxx,
  NorwegianXxNorwnok1,
  RevolutRevolt21,
  SebKortBankAb,
  SebPrivat,
  SandboxfinanceSfin0000,
  SparnordSpnodk22,
  SpkKarlsruheKarsde66,
  SpkMarburgBiedenkopfHeladef1mar,
  SpkWormsAlzeyRiedMalade51wor,
  SskDusseldorfDussdeddxxx,
  SwedbankHabalv22,
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
