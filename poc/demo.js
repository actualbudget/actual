import { createMockConfig } from './payPeriodConfig.js';
import { generatePayPeriods } from './payPeriodGenerator.js';
import { resolveMonthRange, getMonthLabel } from './payPeriodDates.js';

function log(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

const config = createMockConfig({ payFrequency: 'biweekly', startDate: '2024-01-05', yearStart: 2024 });

console.log('--- Generate pay periods for 2024 (biweekly) ---');
const periods = generatePayPeriods(2024, config);
console.log(`Generated ${periods.length} periods`);
console.log(periods.slice(0, 3));

console.log('\n--- Convert month IDs ---');
['202401', '202402', '202413', '202414', '202415'].forEach(id => {
  const range = resolveMonthRange(id, config);
  console.log(id, getMonthLabel(id, config), range.startDate.toISOString().slice(0,10), '->', range.endDate.toISOString().slice(0,10));
});

console.log('\n--- Edge cases ---');
try { resolveMonthRange('202400', config); } catch (e) { console.log('Invalid 202400:', e.message); }
try { resolveMonthRange('2024100', config); } catch (e) { console.log('Invalid 2024100:', e.message); }

console.log('\n--- Performance (weekly ~ 50+) ---');
const weekly = createMockConfig({ payFrequency: 'weekly' });
console.time('generate weekly');
const weeklyPeriods = generatePayPeriods(2024, weekly);
console.timeEnd('generate weekly');
console.log('Weekly count:', weeklyPeriods.length);
