/**
 * Generation of pay periods for a given year based on config.
 */
import { computePayPeriodByIndex } from './payPeriodDates.js';

/**
 * @typedef {import('./payPeriodDates.js').PayPeriodConfig} PayPeriodConfig
 */

/**
 * Generate pay periods for a plan year, returning identifiers, dates, and labels.
 * For PoC we cap at MM 99 (i.e., up to 87 periods).
 * @param {number} year
 * @param {PayPeriodConfig} config
 * @returns {Array<{ monthId: string, startDate: string, endDate: string, label: string }>} ISO strings
 */
export function generatePayPeriods(year, config) {
  if (!config || !config.enabled) return [];
  if (year !== config.yearStart) {
    throw new Error(`Year ${year} does not match config.yearStart ${config.yearStart}`);
  }

  const output = [];
  let index = 1;
  // Conservative upper bounds per frequency
  const maxByFreq = {
    weekly: 53,
    biweekly: 27,
    semimonthly: 24,
    monthly: 12,
  };
  const maxPeriods = maxByFreq[config.payFrequency] ?? 87;

  while (index <= maxPeriods && output.length < 87) {
    const { startDate, endDate, label } = computePayPeriodByIndex(index, config);
    const mm = 12 + index; // 13 => period 1
    const monthId = `${year}${String(mm).padStart(2, '0')}`;
    output.push({
      monthId,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      label,
    });
    index += 1;
  }

  return output;
}
