import Fallback from './integration-bank.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['HANSEATIC_HSTBDEHH'],

  accessValidForDays: 89,
};
