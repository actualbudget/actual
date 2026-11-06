import {
  getDayMonthFormat,
  getDayMonthRegex,
  getShortYearFormat,
  getShortYearRegex,
} from '@actual-app/core/shared/months';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity,
} from '@actual-app/core/types/models';
import {
  addDays,
  format as formatDate,
  isValid,
  parse as parseDate,
  parseISO,
  subDays,
} from 'date-fns';

/**
 * How sure the parser is about a field:
 * - `high`: found in the text and matched exactly
 * - `low`: guessed (a default, a close match, or a new payee)
 * - `none`: not found
 */
export type QuickAddConfidence = 'high' | 'low' | 'none';

export type QuickAddField<T> = {
  value: T;
  confidence: QuickAddConfidence;
  /** The words from the input this field was read from, if any. */
  text?: string;
};

export type QuickAddDirection = 'outflow' | 'inflow';

export type QuickAddPayee = {
  /** Existing payee id, or null when a new payee would be created. */
  id: PayeeEntity['id'] | null;
  name: string;
};

export type QuickAddResult = {
  /** `yyyy-MM-dd` */
  date: QuickAddField<string>;
  /** Always positive; `direction` gives the sign. */
  amount: QuickAddField<IntegerAmount | null>;
  direction: QuickAddField<QuickAddDirection>;
  payee: QuickAddField<QuickAddPayee | null>;
  category: QuickAddField<CategoryEntity['id'] | null>;
  /** True when nothing usable (not even an amount) was found. */
  isUnparsed: boolean;
};

/**
 * The words a language uses for quick-add sentences. All entries are
 * lowercase; multi-word phrases are separated by single spaces.
 */
export type QuickAddLanguage = {
  outflowPhrases: string[];
  inflowPhrases: string[];
  /** Words followed by a payee, e.g. "at Target". */
  payeeMarkers: string[];
  /** Words followed by a category, e.g. "on groceries". */
  categoryMarkers: string[];
  /** Words followed by a category if one matches, otherwise a payee. */
  payeeOrCategoryMarkers: string[];
  /** Words that may come right before a date, e.g. "on 10/16". */
  dateMarkers: string[];
  currencyWords: string[];
  today: string[];
  yesterday: string[];
  tomorrow: string[];
  /** e.g. "last" in "last friday". */
  last: string[];
  /** e.g. "ago" in "2 days ago". */
  ago: string[];
  /** Number of days per unit word, e.g. { day: 1, weeks: 7 }. */
  dayUnits: Record<string, number>;
  /** Spelled-out small numbers, e.g. { a: 1, two: 2 }. */
  numberWords: Record<string, number>;
  /** Names for each weekday, Sunday first. */
  weekdays: string[][];
  /** Names for each month, January first. */
  months: string[][];
};

export const englishQuickAddLanguage: QuickAddLanguage = {
  outflowPhrases: [
    'spent',
    'spend',
    'paid',
    'pay',
    'bought',
    'buy',
    'purchased',
    'charged',
    'cost',
  ],
  inflowPhrases: [
    'got paid',
    'received',
    'earned',
    'deposited',
    'deposit',
    'refunded',
    'refund',
  ],
  payeeMarkers: ['at', 'to', 'from'],
  categoryMarkers: ['on'],
  payeeOrCategoryMarkers: ['for'],
  dateMarkers: ['on'],
  currencyWords: ['dollars', 'dollar', 'bucks', 'usd'],
  today: ['today'],
  yesterday: ['yesterday'],
  tomorrow: ['tomorrow'],
  last: ['last'],
  ago: ['ago'],
  dayUnits: { day: 1, days: 1, week: 7, weeks: 7 },
  numberWords: {
    a: 1,
    an: 1,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  },
  weekdays: [
    ['sunday', 'sun'],
    ['monday', 'mon'],
    ['tuesday', 'tue', 'tues'],
    ['wednesday', 'wed'],
    ['thursday', 'thu', 'thur', 'thurs'],
    ['friday', 'fri'],
    ['saturday', 'sat'],
  ],
  months: [
    ['january', 'jan'],
    ['february', 'feb'],
    ['march', 'mar'],
    ['april', 'apr'],
    ['may'],
    ['june', 'jun'],
    ['july', 'jul'],
    ['august', 'aug'],
    ['september', 'sep', 'sept'],
    ['october', 'oct'],
    ['november', 'nov'],
    ['december', 'dec'],
  ],
};

export type QuickAddContext = {
  /** Today's date as `yyyy-MM-dd`. */
  today: string;
  /** The budget's date format, e.g. `MM/dd/yyyy`. */
  dateFormat: string;
  /** Parses an amount using the budget's number format and currency. */
  parseAmount: (text: string) => IntegerAmount | null;
  payees: ReadonlyArray<Pick<PayeeEntity, 'id' | 'name' | 'transfer_acct'>>;
  categoryGroups: ReadonlyArray<
    Pick<CategoryGroupEntity, 'id' | 'name'> & {
      categories?: ReadonlyArray<Pick<CategoryEntity, 'id' | 'name'>>;
    }
  >;
  language?: QuickAddLanguage;
};

type Token = {
  /** The word as typed, without surrounding punctuation. */
  text: string;
  /** Lowercase `text`, used for keyword matching. */
  word: string;
  isUsed: boolean;
};

const CURRENCY_SYMBOLS = '$€£¥₹';
const AMOUNT_PATTERN = new RegExp(
  `^[-+]?[${CURRENCY_SYMBOLS}]?\\d[\\d.,'\\u00a0\\u202f]*[${CURRENCY_SYMBOLS}]?$`,
);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseQuickAddText(
  input: string,
  context: QuickAddContext,
): QuickAddResult {
  const language = context.language ?? englishQuickAddLanguage;
  const tokens = tokenize(input);

  const direction = findDirection(tokens, language);
  const hashtag = findHashtag(tokens);
  // Amounts marked as money go first, then dates, then plain numbers, so
  // "2 days ago" isn't read as an amount of 2.
  const markedAmount = findAmount(tokens, language, context, true);
  const date = findDate(tokens, language, context);
  const amount =
    markedAmount.value != null
      ? markedAmount
      : findAmount(tokens, language, context, false);
  const segments = findSegments(tokens, language);

  let payeeText: string | null = null;
  let categoryText: string | null = hashtag;
  for (const segment of segments) {
    if (segment.text === '') {
      continue;
    }
    const isCategoryMatch =
      matchCategory(segment.text, context.categoryGroups) != null;

    if (language.payeeMarkers.includes(segment.marker ?? '')) {
      payeeText ??= segment.text;
    } else if (language.categoryMarkers.includes(segment.marker ?? '')) {
      categoryText ??= segment.text;
    } else if (language.payeeOrCategoryMarkers.includes(segment.marker ?? '')) {
      if (isCategoryMatch && categoryText == null) {
        categoryText = segment.text;
      } else {
        payeeText ??= segment.text;
      }
    } else if (isCategoryMatch) {
      // Leading words with no marker, e.g. "rent" in "1,200 rent"
      categoryText ??= segment.text;
    }
  }

  const payee =
    payeeText != null ? matchPayee(payeeText, context.payees) : null;
  const categoryId =
    categoryText != null
      ? matchCategory(categoryText, context.categoryGroups)
      : null;

  return {
    date,
    amount,
    direction,
    payee: payee
      ? { value: payee.payee, confidence: payee.confidence, text: payeeText! }
      : { value: null, confidence: 'none' },
    category: {
      value: categoryId,
      confidence: categoryId ? 'high' : 'none',
      ...(categoryText != null && { text: categoryText }),
    },
    isUnparsed: amount.value == null,
  };
}

function tokenize(input: string): Token[] {
  return input
    .split(/\s+/)
    .map(raw => raw.replace(/^[("'“‘]+|[)"'”’,;:!?]+$|\.$/g, ''))
    .filter(text => text !== '')
    .map(text => ({ text, word: text.toLowerCase(), isUsed: false }));
}

function phraseLength(tokens: Token[], start: number, phrase: string) {
  const words = phrase.split(' ');
  for (let i = 0; i < words.length; i++) {
    const token = tokens[start + i];
    if (!token || token.isUsed || token.word !== words[i]) {
      return 0;
    }
  }
  return words.length;
}

function markUsed(tokens: Token[], start: number, count: number) {
  for (let i = start; i < start + count; i++) {
    tokens[i].isUsed = true;
  }
}

function findDirection(
  tokens: Token[],
  language: QuickAddLanguage,
): QuickAddField<QuickAddDirection> {
  // Check inflow first so "got paid" wins over "paid"
  const candidates: Array<[QuickAddDirection, string]> = [
    ...language.inflowPhrases.map(
      p => ['inflow', p] as [QuickAddDirection, string],
    ),
    ...language.outflowPhrases.map(
      p => ['outflow', p] as [QuickAddDirection, string],
    ),
  ].sort((a, b) => b[1].split(' ').length - a[1].split(' ').length);

  for (let i = 0; i < tokens.length; i++) {
    for (const [direction, phrase] of candidates) {
      const length = phraseLength(tokens, i, phrase);
      if (length > 0) {
        markUsed(tokens, i, length);
        return {
          value: direction,
          confidence: 'high',
          text: tokens
            .slice(i, i + length)
            .map(t => t.text)
            .join(' '),
        };
      }
    }
  }

  return { value: 'outflow', confidence: 'low' };
}

function findHashtag(tokens: Token[]): string | null {
  const token = tokens.find(t => !t.isUsed && /^#\S/.test(t.text));
  if (!token) {
    return null;
  }
  token.isUsed = true;
  return token.text.slice(1).replace(/_/g, ' ');
}

function findAmount(
  tokens: Token[],
  language: QuickAddLanguage,
  context: QuickAddContext,
  isMarkedOnly: boolean,
): QuickAddField<IntegerAmount | null> {
  const isAmountToken = (token: Token | undefined) =>
    !!token && !token.isUsed && AMOUNT_PATTERN.test(token.text);
  const isCurrencyWord = (token: Token | undefined) =>
    !!token && !token.isUsed && language.currencyWords.includes(token.word);
  const hasCurrencySymbol = (token: Token) =>
    new RegExp(`[${CURRENCY_SYMBOLS}]`).test(token.text);

  // A number marked as money: "$40", "40 dollars"
  let index = tokens.findIndex(
    (token, i) =>
      isAmountToken(token) &&
      (hasCurrencySymbol(token) || isCurrencyWord(tokens[i + 1])),
  );
  if (index === -1 && !isMarkedOnly) {
    index = tokens.findIndex(
      token =>
        isAmountToken(token) &&
        // Leave values that look like dates for the date parser
        !/^\d{1,4}[/-]\d{1,2}([/-]\d{1,4})?$/.test(token.text),
    );
  }
  if (index === -1) {
    return { value: null, confidence: 'none' };
  }

  const token = tokens[index];
  const value = context.parseAmount(
    token.text.replace(new RegExp(`[${CURRENCY_SYMBOLS}+-]`, 'g'), ''),
  );
  if (value == null) {
    return { value: null, confidence: 'none' };
  }

  token.isUsed = true;
  if (isCurrencyWord(tokens[index + 1])) {
    tokens[index + 1].isUsed = true;
  }
  return { value: Math.abs(value), confidence: 'high', text: token.text };
}

function findDate(
  tokens: Token[],
  language: QuickAddLanguage,
  context: QuickAddContext,
): QuickAddField<string> {
  const today = parseISO(context.today);

  for (let i = 0; i < tokens.length; i++) {
    const match = matchDateAt(tokens, i, today, language, context);
    if (match) {
      let start = i;
      if (start > 0 && language.dateMarkers.includes(tokens[start - 1].word)) {
        // Also drop "on" in "on 10/16" so it isn't read as a category marker
        start -= 1;
      }
      const count = i - start + match.length;
      const text = tokens
        .slice(start, start + count)
        .map(t => t.text)
        .join(' ');
      markUsed(tokens, start, count);
      return {
        value: formatDate(match.date, 'yyyy-MM-dd'),
        confidence: 'high',
        text,
      };
    }
  }

  return { value: context.today, confidence: 'low' };
}

function indexOfName(names: string[][], word: string | undefined) {
  if (word == null) {
    return -1;
  }
  return names.findIndex(list => list.includes(word.replace(/\.$/, '')));
}

function matchDateAt(
  tokens: Token[],
  i: number,
  today: Date,
  language: QuickAddLanguage,
  context: QuickAddContext,
): { date: Date; length: number } | null {
  const word = (offset: number) => {
    const token = tokens[i + offset];
    return token && !token.isUsed ? token.word : undefined;
  };
  const first = word(0);
  if (first == null) {
    return null;
  }

  if (language.today.includes(first)) {
    return { date: today, length: 1 };
  }
  if (language.yesterday.includes(first)) {
    return { date: subDays(today, 1), length: 1 };
  }
  if (language.tomorrow.includes(first)) {
    return { date: addDays(today, 1), length: 1 };
  }

  // "2 days ago", "a week ago"
  const count = /^\d+$/.test(first)
    ? Number(first)
    : language.numberWords[first];
  const unit = word(1);
  const ago = word(2);
  if (
    count != null &&
    unit != null &&
    language.dayUnits[unit] != null &&
    ago != null &&
    language.ago.includes(ago)
  ) {
    return { date: subDays(today, count * language.dayUnits[unit]), length: 3 };
  }

  // "last friday" is the most recent Friday before today; a bare "friday"
  // may also be today.
  if (language.last.includes(first)) {
    const weekday = indexOfName(language.weekdays, word(1));
    if (weekday !== -1) {
      const daysBack = (today.getDay() - weekday + 7) % 7 || 7;
      return { date: subDays(today, daysBack), length: 2 };
    }
  }
  const previous = tokens[i - 1]?.word;
  const isMarked = previous != null && language.dateMarkers.includes(previous);
  const weekday = indexOfName(language.weekdays, first);
  // Short names like "sun" or "sat" are common words, so only read them as
  // weekdays after "on"
  const isFullWeekdayName =
    weekday !== -1 && language.weekdays[weekday][0] === first;
  if (weekday !== -1 && (isFullWeekdayName || isMarked)) {
    const daysBack = (today.getDay() - weekday + 7) % 7;
    return { date: subDays(today, daysBack), length: 1 };
  }

  // "Oct 16", "October 16 2026", "16 Oct"
  const monthFirst = indexOfName(language.months, first);
  const dayAfter = word(1)?.replace(/(st|nd|rd|th)$/, '');
  if (monthFirst !== -1 && dayAfter && /^\d{1,2}$/.test(dayAfter)) {
    const year = word(2);
    const hasYear = !!year && /^\d{4}$/.test(year);
    const date = hasYear
      ? new Date(Number(year), monthFirst, Number(dayAfter))
      : mostRecentDate(monthFirst, Number(dayAfter), today);
    if (date && date.getDate() === Number(dayAfter)) {
      return { date, length: hasYear ? 3 : 2 };
    }
  }
  const dayFirst = first.replace(/(st|nd|rd|th)$/, '');
  const monthAfter = indexOfName(language.months, word(1));
  if (/^\d{1,2}$/.test(dayFirst) && monthAfter !== -1) {
    const year = word(2);
    const hasYear = !!year && /^\d{4}$/.test(year);
    const date = hasYear
      ? new Date(Number(year), monthAfter, Number(dayFirst))
      : mostRecentDate(monthAfter, Number(dayFirst), today);
    if (date && date.getDate() === Number(dayFirst)) {
      return { date, length: hasYear ? 3 : 2 };
    }
  }

  // Numeric dates, read with the budget's date format
  const numericDate = parseNumericDate(first, today, context.dateFormat);
  if (numericDate) {
    const separator = context.dateFormat.replace(/[dMy]/g, '')[0];
    // "12.50" could be an amount in formats that use dots, so only read
    // it as a date when it follows "on".
    const isAmbiguous =
      !ISO_DATE_PATTERN.test(first) && (separator === '.' || separator === ',');
    if (!isAmbiguous || isMarked) {
      return { date: numericDate, length: 1 };
    }
  }

  return null;
}

function parseNumericDate(
  text: string,
  today: Date,
  dateFormat: string,
): Date | null {
  if (getDayMonthRegex(dateFormat).test(text)) {
    const date = parseDate(text, getDayMonthFormat(dateFormat), today);
    return isValid(date)
      ? mostRecentDate(date.getMonth(), date.getDate(), today)
      : null;
  }

  const attempts: Array<[boolean, string]> = [
    [ISO_DATE_PATTERN.test(text), 'yyyy-MM-dd'],
    [getShortYearRegex(dateFormat).test(text), getShortYearFormat(dateFormat)],
    [true, dateFormat],
  ];
  for (const [isCandidate, pattern] of attempts) {
    if (isCandidate && /\d/.test(text)) {
      const date = parseDate(text, pattern, today);
      if (isValid(date) && date.getFullYear() >= 1000) {
        return date;
      }
    }
  }
  return null;
}

// A date given without a year means its most recent occurrence, since quick
// add records transactions that have already happened.
function mostRecentDate(month: number, day: number, today: Date): Date | null {
  for (const year of [today.getFullYear(), today.getFullYear() - 1]) {
    const date = new Date(year, month, day);
    if (date.getMonth() === month && date <= today) {
      return date;
    }
  }
  return null;
}

type Segment = { marker: string | null; text: string };

function findSegments(tokens: Token[], language: QuickAddLanguage): Segment[] {
  const markers = [
    ...language.payeeMarkers,
    ...language.categoryMarkers,
    ...language.payeeOrCategoryMarkers,
  ];
  const segments: Segment[] = [];
  let current: { marker: string | null; words: string[] } = {
    marker: null,
    words: [],
  };

  for (const token of tokens) {
    if (token.isUsed) {
      continue;
    }
    if (markers.includes(token.word)) {
      segments.push({ marker: current.marker, text: current.words.join(' ') });
      current = { marker: token.word, words: [] };
    } else {
      current.words.push(token.text);
    }
  }
  segments.push({ marker: current.marker, text: current.words.join(' ') });

  return segments;
}

function normalise(text: string) {
  return getNormalisedString(text).trim().replace(/\s+/g, ' ');
}

function matchPayee(
  text: string,
  payees: QuickAddContext['payees'],
): { payee: QuickAddPayee; confidence: QuickAddConfidence } {
  const query = normalise(text);
  const candidates = payees.filter(payee => !payee.transfer_acct && payee.name);

  const exact = candidates.find(payee => normalise(payee.name) === query);
  if (exact) {
    return { payee: { id: exact.id, name: exact.name }, confidence: 'high' };
  }

  // A close match: one name contains the other ("starbucks" and
  // "Starbucks Coffee"). Prefer the shortest such name.
  if (query.length >= 3) {
    const close = candidates
      .filter(payee => {
        const name = normalise(payee.name);
        return name.includes(query) || query.includes(name);
      })
      .sort((a, b) => a.name.length - b.name.length)[0];
    if (close) {
      return { payee: { id: close.id, name: close.name }, confidence: 'low' };
    }
  }

  return { payee: { id: null, name: text.trim() }, confidence: 'low' };
}

/**
 * Finds a category by name or by "Group:Category". A name used by more
 * than one group only matches when the group is given.
 */
export function matchCategory(
  text: string,
  categoryGroups: QuickAddContext['categoryGroups'],
): CategoryEntity['id'] | null {
  const separatorIndex = text.indexOf(':');
  if (separatorIndex !== -1) {
    const groupName = normalise(text.slice(0, separatorIndex));
    const categoryName = normalise(text.slice(separatorIndex + 1));
    const match = categoryGroups
      .filter(group => normalise(group.name) === groupName)
      .flatMap(group => group.categories ?? [])
      .find(category => normalise(category.name) === categoryName);
    return match?.id ?? null;
  }

  const name = normalise(text);
  const matches = categoryGroups
    .flatMap(group => group.categories ?? [])
    .filter(category => normalise(category.name) === name);
  return matches.length === 1 ? matches[0].id : null;
}
