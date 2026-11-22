import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['ING_INGBITMM'],

  /**
   * Requisitions linked to a pre-created end-user agreement remain in `UA`
   * after authorization at ING, whereas those using GoCardless' default
   * agreement complete the linking process successfully.
   */
  skipEndUserAgreement: true,
} satisfies IBank;
