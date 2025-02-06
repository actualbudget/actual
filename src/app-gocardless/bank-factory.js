import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import IntegrationBank from './banks/integration-bank.js';

const dirname = path.resolve(fileURLToPath(import.meta.url), '..');
const banksDir = path.resolve(dirname, 'banks');

async function loadBanks() {
  const bankHandlers = fs
    .readdirSync(banksDir)
    .filter((filename) => filename.includes('_') && filename.endsWith('.js'));

  const imports = await Promise.all(
    bankHandlers.map((file) => {
      const fileUrlToBank = pathToFileURL(path.resolve(banksDir, file)); // pathToFileURL for ESM compatibility
      return import(fileUrlToBank.toString()).then(
        (handler) => handler.default,
      );
    }),
  );

  return imports;
}

export const banks = await loadBanks();

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
  'CAIXA_GERAL_DEPOSITOS_CGDIPTPL',
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
