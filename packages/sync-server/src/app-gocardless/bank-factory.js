import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import IntegrationBank from './banks/integration-bank.js';

const dirname = path.resolve(fileURLToPath(import.meta.url), '..');
const banksDir = path.resolve(dirname, 'banks');

async function loadBanks() {
  const bankHandlers = fs
    .readdirSync(banksDir)
    .filter(filename => filename.includes('_') && filename.endsWith('.js'));

  const imports = await Promise.all(
    bankHandlers.map(file => {
      const fileUrlToBank = pathToFileURL(path.resolve(banksDir, file)); // pathToFileURL for ESM compatibility
      return import(fileUrlToBank.toString()).then(handler => handler.default);
    }),
  );

  return imports;
}

export const banks = await loadBanks();

export function BankFactory(institutionId) {
  return (
    banks.find(b => b.institutionIds.includes(institutionId)) || IntegrationBank
  );
}

export const BANKS_WITH_LIMITED_HISTORY = [
  'ABANCA_CAGLESMM',
  'AIRBANK_AIRACZPP',
  'BANCA_AIDEXA_AIDXITMM',
  'BANCA_PATRIMONI_SENVITT1',
  'BANCA_SELLA_SELBIT2B',
  'BANK_MILLENNIUM_BIGBPLPW',
  'BANKINTER_BKBKESMM',
  'BBVA_BBVAESMM',
  'BELFIUS_GKCCBEBB',
  'BNP_BE_GEBABEBB',
  'BNP_PL_PPABPLPK',
  'BOURSORAMA_BOUSFRPP',
  'BOV_VALLMTMT',
  'BRED_BREDFRPPXXX',
  'CAIXA_GERAL_DEPOSITOS_CGDIPTPL',
  'CAIXABANK_CAIXESBB',
  'CARTALIS_CIMTITR1',
  'CESKA_SPORITELNA_LONG_GIBACZPX',
  'COOP_EKRDEE22',
  'DKB_BYLADEM1',
  'DNB_DNBANOKK',
  'DOTS_HYEEIT22',
  'FINECO_FEBIITM2XXX',
  'FINECO_UK_FEBIITM2XXX',
  'FORTUNEO_FTNOFRP1XXX',
  'GLS_GEMEINSCHAFTSBANK_GENODEM1GLS',
  'HYPE_BUSINESS_HYEEIT22',
  'HYPE_HYEEIT22',
  'ILLIMITY_ITTPIT2M',
  'INDUSTRA_MULTLV2X',
  'INDUSTRIEL_CMCIFRPAXXX',
  'ING_PL_INGBPLPW',
  'JEKYLL_JEYKLL002',
  'KBC_KREDBEBB',
  'KBC_BRUSSELS_KREDBEBB',
  'LABORALKUTXA_CLPEES2M',
  'LANSFORSAKRINGAR_ELLFSESS',
  'LCL_CRLYFRPP',
  'LHV_LHVBEE22',
  'LUMINOR_AGBLLT2X',
  'LUMINOR_NDEAEE2X',
  'LUMINOR_NDEALT2X',
  'LUMINOR_NDEALV2X',
  'LUMINOR_RIKOEE22',
  'LUMINOR_RIKOLV2X',
  'MBANK_RETAIL_BREXPLPW',
  'MEDICINOSBANK_MDBALT22XXX',
  'NORDEA_NDEADKKK',
  'N26_NTSBDEB1',
  'OPYN_BITAITRRB2B',
  'PAYTIPPER_PAYTITM1',
  'QONTO_QNTOFRP1',
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
