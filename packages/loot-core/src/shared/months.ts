import * as d from 'date-fns';
import memoizeOne from 'memoize-one';

function _parse(value: string | Date) {
  if (typeof value === 'string') {
    // Dates are hard. We just want to deal with months in the format
    // 2020-01 and days in the format 2020-01-01, but life is never
    // simple. We want to rely on native dates for date logic because
    // days are complicated (leap years, etc). But relying on native
    // dates mean we're exposed to craziness.
    //
    // The biggest problem is that JS dates work with local time by
    // default. We could try to only work with UTC, but there's not an
    // easy way to make `format` avoid local time, and not sure if we
    // want that anyway (`currentMonth` should surely print the local
    // time). We need to embrace local time, and as long as inputs to
    // date logic and outputs from format are local time, it should
    // work.
    //
    // To make sure we're in local time, always give Date integer
    // values. If you pass in a string to parse, different string
    // formats produce different results.
    //
    // A big problem is daylight savings, however. Usually, when
    // giving the time to the Date constructor, you get back a date
    // specifically for that time in your local timezone. However, if
    // daylight savings occurs on that exact time, you will get back
    // something different:
    //
    // This is fine:
    // > new Date(2017, 2, 12, 1).toString()
    // > 'Sun Mar 12 2017 01:00:00 GMT-0500 (Eastern Standard Time)'
    //
    // But wait, we got back a different time (3AM instead of 2AM):
    // > new Date(2017, 2, 12, 2).toString()
    // > 'Sun Mar 12 2017 03:00:00 GMT-0400 (Eastern Daylight Time)'
    //
    // The time is "correctly" adjusted via DST, but we _really_
    // wanted 2AM. The problem is that time simply doesn't exist.
    //
    // Why is this a problem? Well, consider a case where the DST
    // shift happens *at midnight* and it goes back an hour. You think
    // you have a date object for the next day, but when formatted it
    // actually shows the previous day. A more likely scenario: buggy
    // timezone data makes JS dates do this shift when it shouldn't,
    // so using midnight at the time for date logic gives back the
    // last day. See the time range of Sep 30 15:00 - Oct 1 1:00 for
    // the AEST timezone when nodejs-mobile incorrectly gives you back
    // a time an hour *before* you specified. Since this happens on
    // Oct 1, doing `addMonths(September, 1)` still gives you back
    // September. Issue here:
    // https://github.com/JaneaSystems/nodejs-mobile/issues/251
    //
    // The fix is simple once you understand this. Always use the 12th
    // hour of the day. That's it. There is no DST that shifts more
    // than 12 hours (god let's hope not) so no matter how far DST has
    // shifted backwards or forwards, doing date logic will stay
    // within the day we want.

    let [year, month, day] = value.split('-');
    if (day != null) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12);
    } else if (month != null) {
      return new Date(parseInt(year), parseInt(month) - 1, 1, 12);
    } else {
      return new Date(parseInt(year), 0, 1, 12);
    }
  }
  return value;
}

export const parseDate = _parse;

export function yearFromDate(date) {
  return d.format(_parse(date), 'yyyy');
}

export function monthFromDate(date) {
  return d.format(_parse(date), 'yyyy-MM');
}

export function dayFromDate(date) {
  return d.format(_parse(date), 'yyyy-MM-dd');
}

export function currentMonth() {
  if (global.IS_TESTING) {
    return global.currentMonth || '2017-01';
  } else {
    return d.format(new Date(), 'yyyy-MM');
  }
}

export function currentDay() {
  if (global.IS_TESTING) {
    return '2017-01-01';
  } else {
    return d.format(new Date(), 'yyyy-MM-dd');
  }
}

export function nextMonth(month) {
  return d.format(d.addMonths(_parse(month), 1), 'yyyy-MM');
}

export function prevMonth(month) {
  return d.format(d.subMonths(_parse(month), 1), 'yyyy-MM');
}

export function addMonths(month, n) {
  return d.format(d.addMonths(_parse(month), n), 'yyyy-MM');
}

export function subMonths(month, n) {
  return d.format(d.subMonths(_parse(month), n), 'yyyy-MM');
}

export function addDays(day, n) {
  return d.format(d.addDays(_parse(day), n), 'yyyy-MM-dd');
}

export function subDays(day, n) {
  return d.format(d.subDays(_parse(day), n), 'yyyy-MM-dd');
}

export function isBefore(month1, month2) {
  return d.isBefore(_parse(month1), _parse(month2));
}

export function isAfter(month1, month2) {
  return d.isAfter(_parse(month1), _parse(month2));
}

// TODO: This doesn't really fit in this module anymore, should
// probably live elsewhere
export function bounds(month) {
  return {
    start: parseInt(d.format(d.startOfMonth(_parse(month)), 'yyyyMMdd')),
    end: parseInt(d.format(d.endOfMonth(_parse(month)), 'yyyyMMdd')),
  };
}

export function _range(start, end, inclusive = false) {
  const months = [];
  let month = monthFromDate(start);
  while (d.isBefore(_parse(month), _parse(end))) {
    months.push(month);
    month = addMonths(month, 1);
  }

  if (inclusive) {
    months.push(month);
  }

  return months;
}

export function range(start, end) {
  return _range(start, end);
}

export function rangeInclusive(start, end) {
  return _range(start, end, true);
}

export function _dayRange(start, end, inclusive = false) {
  const days = [];
  let day = start;
  while (d.isBefore(_parse(day), _parse(end))) {
    days.push(day);
    day = addDays(day, 1);
  }

  if (inclusive) {
    days.push(day);
  }

  return days;
}

export function dayRange(start, end) {
  return _dayRange(start, end);
}

export function dayRangeInclusive(start, end) {
  return _dayRange(start, end, true);
}

export function getMonthIndex(month) {
  return parseInt(month.slice(5, 7)) - 1;
}

export function getYear(month) {
  return month.slice(0, 4);
}

export function getMonth(day) {
  return day.slice(0, 7);
}

export function getYearStart(month) {
  return getYear(month) + '-01';
}

export function getYearEnd(month) {
  return getYear(month) + '-12';
}

export function sheetForMonth(month) {
  return 'budget' + month.replace('-', '');
}

export function nameForMonth(month) {
  // eslint-disable-next-line rulesdir/typography
  return d.format(_parse(month), "MMMM 'yy");
}

export function format(month, str) {
  return d.format(_parse(month), str);
}

export const getDateFormatRegex = memoizeOne(format => {
  return new RegExp(
    format
      .replace(/d+/g, '\\d{1,2}')
      .replace(/M+/g, '\\d{1,2}')
      .replace(/y+/g, '\\d{4}'),
  );
});

export const getDayMonthFormat = memoizeOne(format => {
  return format
    .replace(/y+/g, '')
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '');
});

export const getDayMonthRegex = memoizeOne(format => {
  let regex = format
    .replace(/y+/g, '')
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '')
    .replace(/d+/g, '\\d{1,2}')
    .replace(/M+/g, '\\d{1,2}');
  return new RegExp('^' + regex + '$');
});

export const getMonthYearFormat = memoizeOne(format => {
  return format
    .replace(/d+/g, '')
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '')
    .replace(/\/\//, '/')
    .replace(/\.\./, '.')
    .replace(/--/, '-');
});

export const getMonthYearRegex = memoizeOne(format => {
  let regex = format
    .replace(/d+/g, '')
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '')
    .replace(/\/\//, '/')
    .replace(/M+/g, '\\d{1,2}')
    .replace(/y+/g, '\\d{2,4}');
  return new RegExp('^' + regex + '$');
});

export const getShortYearFormat = memoizeOne(format => {
  return format.replace(/y+/g, 'yy');
});

export const getShortYearRegex = memoizeOne(format => {
  let regex = format
    .replace(/[^\w]$/, '')
    .replace(/^[^\w]/, '')
    .replace(/d+/g, '\\d{1,2}')
    .replace(/M+/g, '\\d{1,2}')
    .replace(/y+/g, '\\d{2}');
  return new RegExp('^' + regex + '$');
});
