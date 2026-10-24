import { appendFileSync } from 'node:fs';

let holding = false;
const waiters = new Map();
const calls = [];
function release(date) {
  if (date === undefined) holding = false;
  for (const [key, pending] of waiters) {
    if (date === undefined || key === date) {
      waiters.delete(key);
      for (const resolve of pending) resolve();
    }
  }
}
export const __control = {
  mode: 'normal',
  calls,
  hold() {
    holding = true;
  },
  holdAll() {
    holding = true;
  },
  release,
  reset() {
    release();
    calls.length = 0;
    __control.mode = 'normal';
  },
};
const table = {
  'USD/EUR/2026-03-04': ['0.9', '2026-03-04'],
  'USD/EUR/2026-03-11': ['0.92', '2026-03-11'],
  'USD/EUR/2026-03-12': ['0.921', '2026-03-11'],
  'USD/EUR/2026-03-14': ['0.93', '2026-03-13'],
  'USD/EUR/2026-03-18': ['0.94', '2026-03-11'],
  'USD/EUR/2026-03-19': ['0.95', '2026-03-11'],
  'USD/EUR/2026-12-31': ['2', '2026-12-31'],
  'USD/EUR/2027-01-07': ['2.5', '2026-12-31'],
  'USD/EUR/2027-01-08': ['2.5', '2026-12-31'],
  'USD/JPY/2026-03-11': ['150', '2026-03-11'],
  'JPY/USD/2026-03-11': ['0.006666666666667', '2026-03-11'],
  'USD/JPY/2026-03-31': ['125', '2026-03-31'],
  'USD/KWD/2026-03-11': ['0.307', '2026-03-11'],
};
function priorFriday(date) {
  const day = new Date(`${date}T00:00:00.000Z`);
  const weekday = day.getUTCDay();
  day.setUTCDate(
    day.getUTCDate() - (weekday === 0 ? 2 : weekday === 6 ? 1 : 0),
  );
  return day.toISOString().slice(0, 10);
}
function businessDays({ base, quote, date }) {
  if (base !== 'USD' || quote !== 'EUR') return { status: 'missing' };
  const effectiveDate = priorFriday(date);
  return {
    status: 'ok',
    base,
    quote,
    effectiveDate,
    rate: `0.${900 + Number(effectiveDate.slice(8))}`.replace(/0+$/, ''),
  };
}
async function lookup({ base, quote, date }, { signal }) {
  const request = { base, quote, date };
  const mode = __control.mode;
  const call = calls.push(request);
  if (process.env.FXTEST_CALLS_FILE) {
    appendFileSync(process.env.FXTEST_CALLS_FILE, `${base} ${quote} ${date}\n`);
  }
  if (holding) {
    await new Promise(resolve => {
      const pending = waiters.get(date) ?? [];
      pending.push(resolve);
      waiters.set(date, pending);
    });
  }
  if (mode === 'throw') {
    throw new Error('401 https://rates.invalid/x?app_id=SECRET123');
  }
  if (mode === 'hang-ignore-signal') return new Promise(() => undefined);
  if (mode === 'hang' || mode === 'late-resolve' || mode === 'late-reject') {
    return new Promise((resolve, reject) => {
      const abort = () => {
        if (mode === 'hang') {
          reject(new Error('fixture-aborted'));
        } else {
          setTimeout(
            () =>
              mode === 'late-reject'
                ? reject(new Error('SECRET123'))
                : resolve({
                    status: 'ok',
                    base,
                    quote,
                    rate: '0.92',
                    effectiveDate: date,
                  }),
            1000,
          );
        }
      };
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    });
  }
  if (mode === 'rate-limited') return { status: 'error', code: 'rate-limited' };
  if (mode === 'bad-code') return { status: 'error', code: 'SECRET123' };
  if (mode === 'rate-limited-after-first') {
    return call === 1
      ? businessDays(request)
      : { status: 'error', code: 'rate-limited' };
  }
  if (mode === 'business-days') return businessDays(request);
  if (
    mode === 'missing-0304' &&
    base === 'USD' &&
    quote === 'EUR' &&
    date === '2026-03-04'
  ) {
    return { status: 'missing' };
  }
  const fixed = table[`${base}/${quote}/${date}`];
  if (!fixed && !(mode === 'any-date' && base === 'USD' && quote === 'EUR')) {
    return { status: 'missing' };
  }
  const [rate, effectiveDate] = fixed ?? ['0.92', date];
  const answer = { status: 'ok', base, quote, rate, effectiveDate };
  if (mode === 'extra-fields') return { ...answer, debug: 'SECRET123' };
  const malformed = [
    { rate: '0' },
    { rate: '-0.92' },
    { rate: '1e-3' },
    { rate: 0.92 },
    { rate: '0.0066666666666667' },
    { effectiveDate: '2026-02-30' },
    { effectiveDate: '2026-3-11' },
    { effectiveDate: '2026-03-12' },
    { base: quote, quote: base },
  ];
  const match = /^malformed-([1-9])$/.exec(mode);
  return match ? { ...answer, ...malformed[Number(match[1]) - 1] } : answer;
}

// The approved provider module contract requires a default export.
// oxlint-disable-next-line import/no-default-export
export default {
  apiVersion: 1,
  id: 'fxtest',
  name: 'Test rates',
  version: '1.0.0',
  origins: ['https://rates.invalid'],
  fields: [],
  lookup,
};
