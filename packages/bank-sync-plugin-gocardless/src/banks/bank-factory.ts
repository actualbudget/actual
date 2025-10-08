import AbancaCaglesmm from './abanca_caglesmm.js';
import AbnamroAbnanl2a from './abnamro_abnanl2a.js';
import AmericanExpressAesudef1 from './american_express_aesudef1.js';
import BancsabadellBsabesbbb from './bancsabadell_bsabesbbb.js';
import BankOfIrelandB365Bofiie2d from './bank_of_ireland_b365_bofiie2d.js';
import BankinterBkbkesmm from './bankinter_bkbkesmm.js';
import BelfiusGkccbebb from './belfius_gkccbebb.js';
import BerlinerSparkasseBeladebexxx from './berliner_sparkasse_beladebexxx.js';
import BnpBeGebabebb from './bnp_be_gebabebb.js';
import BoursobankBousfrppxxx from './boursobank_bousfrppxxx.js';
import BperRetailBpmoit22 from './bper_retail_bpmoit22.js';
import CbcCregbebb from './cbc_cregbebb.js';
import CommerzbankCobadeff from './commerzbank_cobadeff.js';
import DanskebankPrivat from './danskebank_privat.js';
import DirektHeladef1822 from './direkt_heladef1822.js';
import EasybankBawaatww from './easybank_bawaatww.js';
import EntercardSwednokk from './entercard_swednokk.js';
import FortuneoFtnofrp1xxx from './fortuneo_ftnofrp1xxx.js';
import HypeHyeeit22 from './hype_hyeeit22.js';
import IngIngbrobu from './ing_ingbrobu.js';
import IngIngddeff from './ing_ingddeff.js';
import IngPlIngbplpw from './ing_pl_ingbplpw.js';
import IsybankItbbitmm from './isybank_itbbitmm.js';
import KbcKredbebb from './kbc_kredbebb.js';
import LhvLhvbee22 from './lhv-lhvbee22.js';
import MbankRetailBrexplpw from './mbank_retail_brexplpw.js';
import NationwideNaiagb21 from './nationwide_naiagb21.js';
import NbgEthngraaxxx from './nbg_ethngraaxxx.js';
import NorwegianXxNorwnok1 from './norwegian_xx_norwnok1.js';
import RaiffeisenAtRzbaatww from './raiffeisen_at_rzbaatww.js';
import RevolutRevolt21 from './revolut_revolt21.js';
import SandboxfinanceSfin0000 from './sandboxfinance_sfin0000.js';
import SebKortBankAb from './seb_kort_bank_ab.js';
import SebPrivat from './seb_privat.js';
import SparnordSpnodk22 from './sparnord_spnodk22.js';
import SpkKarlsruheKarsde66 from './spk_karlsruhe_karsde66.js';
import SpkMarburgBiedenkopfHeladef1mar from './spk_marburg_biedenkopf_heladef1mar.js';
import SpkWormsAlzeyRiedMalade51wor from './spk_worms_alzey_ried_malade51wor.js';
import SskDusseldorfDussdeddxxx from './ssk_dusseldorf_dussdeddxxx.js';
import SskMunchen from './ssk_munchen.js';
import SwedbankHabalv22 from './swedbank_habalv22.js';
import VirginNrnbgb22 from './virgin_nrnbgb22.js';
import IntegrationBank from './integration-bank.js';

type Bankish = {
  institutionIds: string[];
  normalizeTransaction: (
    transaction: any,
    booked: boolean,
    editedTransaction?: any,
  ) => any | null;
  sortTransactions: <T>(transactions: T[]) => T[];
  calculateStartingBalance: (sortedTransactions: any[], balances: any[]) => number;
};

export const banks: Bankish[] = [
  AbancaCaglesmm,
  AbnamroAbnanl2a,
  AmericanExpressAesudef1,
  BancsabadellBsabesbbb,
  BankOfIrelandB365Bofiie2d,
  BankinterBkbkesmm,
  BelfiusGkccbebb,
  BerlinerSparkasseBeladebexxx,
  BnpBeGebabebb,
  BoursobankBousfrppxxx,
  BperRetailBpmoit22,
  CbcCregbebb,
  CommerzbankCobadeff,
  DanskebankPrivat,
  DirektHeladef1822,
  EasybankBawaatww,
  EntercardSwednokk,
  FortuneoFtnofrp1xxx,
  HypeHyeeit22,
  IngIngbrobu,
  IngIngddeff,
  IngPlIngbplpw,
  IsybankItbbitmm,
  KbcKredbebb,
  LhvLhvbee22,
  MbankRetailBrexplpw,
  NationwideNaiagb21,
  NbgEthngraaxxx,
  NorwegianXxNorwnok1,
  RaiffeisenAtRzbaatww,
  RevolutRevolt21,
  SandboxfinanceSfin0000,
  SebKortBankAb,
  SebPrivat,
  SparnordSpnodk22,
  SpkKarlsruheKarsde66,
  SpkMarburgBiedenkopfHeladef1mar,
  SpkWormsAlzeyRiedMalade51wor,
  SskDusseldorfDussdeddxxx,
  SskMunchen,
  SwedbankHabalv22,
  VirginNrnbgb22,
] as Bankish[];

export function bankFactory(institutionId: string | null | undefined): Bankish {
  if (!institutionId) return IntegrationBank as Bankish;
  return (
    banks.find((b) => b.institutionIds.includes(institutionId)) ??
    (IntegrationBank as Bankish)
  );
}

