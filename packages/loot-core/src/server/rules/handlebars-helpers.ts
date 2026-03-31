import {
  addMonths,
  addWeeks,
  addYears,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import * as Handlebars from 'handlebars';

import { logger } from '../../platform/server/log';
import { addDays, format, parseDate, subDays } from '../../shared/months';

export function registerHandlebarsHelpers() {
  const regexTest = /^\/(.*)\/([gimuy]*)$/;

  function mathHelper(fn: (a: number, b: number) => number) {
    return (a: unknown, ...b: unknown[]) => {
      return b.map(Number).reduce(fn, Number(a));
    };
  }

  function regexHelper(
    mapRegex: (regex: string, flags: string) => string | RegExp,
    mapNonRegex: (value: string) => string | RegExp,
    apply: (value: string, regex: string | RegExp, replace: string) => string,
  ) {
    return (value: unknown, regex: unknown, replace: unknown) => {
      if (value == null) {
        return null;
      }

      if (typeof regex !== 'string' || typeof replace !== 'string') {
        return '';
      }

      let regexp: string | RegExp;
      const match = regexTest.exec(regex);
      // Regex is in format /regex/flags
      if (match) {
        regexp = mapRegex(match[1], match[2]);
      } else {
        regexp = mapNonRegex(regex);
      }

      return apply(String(value), regexp, replace);
    };
  }

  const helpers = {
    regex: regexHelper(
      (regex, flags) => new RegExp(regex, flags),
      value => new RegExp(value),
      (value, regex, replace) => value.replace(regex, replace),
    ),
    replace: regexHelper(
      (regex, flags) => new RegExp(regex, flags),
      value => value,
      (value, regex, replace) => value.replace(regex, replace),
    ),
    replaceAll: regexHelper(
      (regex, flags) => new RegExp(regex, flags),
      value => value,
      (value, regex, replace) => value.replaceAll(regex, replace),
    ),
    add: mathHelper((a, b) => a + b),
    sub: mathHelper((a, b) => a - b),
    div: mathHelper((a, b) => a / b),
    mul: mathHelper((a, b) => a * b),
    mod: mathHelper((a, b) => a % b),
    floor: (a: unknown) => Math.floor(Number(a)),
    ceil: (a: unknown) => Math.ceil(Number(a)),
    round: (a: unknown) => Math.round(Number(a)),
    abs: (a: unknown) => Math.abs(Number(a)),
    min: mathHelper((a, b) => Math.min(a, b)),
    max: mathHelper((a, b) => Math.max(a, b)),
    fixed: (a: unknown, digits: unknown) => Number(a).toFixed(Number(digits)),
    day: (date?: string) => date && format(date, 'd'),
    month: (date?: string) => date && format(date, 'M'),
    year: (date?: string) => date && format(date, 'yyyy'),
    format: (date?: string, f?: string) => date && f && format(date, f),
    addDays: (date?: string, days?: number) => {
      if (!date || !days) return date;
      return format(addDays(date, days), 'yyyy-MM-dd');
    },
    subDays: (date?: string, days?: number) => {
      if (!date || !days) return date;
      return format(subDays(date, days), 'yyyy-MM-dd');
    },
    addMonths: (date?: string, months?: number) => {
      if (!date || !months) return date;
      return format(addMonths(parseDate(date), months), 'yyyy-MM-dd');
    },
    subMonths: (date?: string, months?: number) => {
      if (!date || !months) return date;
      return format(subMonths(parseDate(date), months), 'yyyy-MM-dd');
    },
    addWeeks: (date?: string, weeks?: number) => {
      if (!date || !weeks) return date;
      return format(addWeeks(parseDate(date), weeks), 'yyyy-MM-dd');
    },
    subWeeks: (date?: string, weeks?: number) => {
      if (!date || !weeks) return date;
      return format(subWeeks(parseDate(date), weeks), 'yyyy-MM-dd');
    },
    addYears: (date?: string, years?: number) => {
      if (!date || !years) return date;
      return format(addYears(parseDate(date), years), 'yyyy-MM-dd');
    },
    subYears: (date?: string, years?: number) => {
      if (!date || !years) return date;
      return format(subYears(parseDate(date), years), 'yyyy-MM-dd');
    },
    setDay: (date?: string, day?: number) => {
      if (!date || day == null) return date;
      const actualDay = Number(format(date, 'd'));
      return format(addDays(date, day - actualDay), 'yyyy-MM-dd');
    },
    debug: (value: unknown) => {
      logger.log(value);
    },
    concat: (...args: unknown[]) => args.join(''),
  } as Record<string, Handlebars.HelperDelegate>;

  for (const [name, fn] of Object.entries(helpers)) {
    Handlebars.registerHelper(name, (...args: unknown[]) => {
      //The last argument is the Handlebars options object
      return fn(...args.slice(0, -1));
    });
  }
}
