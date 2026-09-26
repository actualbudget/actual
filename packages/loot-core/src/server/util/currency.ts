import * as db from '#server/db';
import * as prefs from '#server/prefs';
import {
  parseAmountEncoding,
  reviewedAmountEncoding,
} from '#shared/amount-encoding';
export async function initializeImportedAmountEncoding(
  currencyCode: string,
): Promise<number> {
  const encoding = reviewedAmountEncoding(currencyCode);
  const value = JSON.stringify(encoding);
  db.runQuery(
    "INSERT OR REPLACE INTO preferences (id, value) VALUES ('defaultCurrencyCode', ?), ('amountEncoding', ?)",
    [currencyCode, value],
  );
  await prefs.savePrefs({ amountEncoding: value });
  return encoding.precision;
}

export function getRecordedAmountPrecision(): number {
  return parseAmountEncoding(prefs.getPrefs()?.amountEncoding)?.precision ?? 2;
}
