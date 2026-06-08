import * as db from '#server/db';

export async function getDefaultCurrencyCode(): Promise<string> {
  try {
    const row = await db.first<{ value: string }>(
      "SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'",
    );
    return row?.value ?? '';
  } catch {
    return '';
  }
}

export async function setDefaultCurrencyCode(code: string): Promise<void> {
  await db.update('preferences', { id: 'defaultCurrencyCode', value: code });
}

export function getDefaultCurrencyCodeSync(): string {
  try {
    const row = db.firstSync<{ value: string }>(
      "SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'",
    );
    return row?.value ?? '';
  } catch {
    return '';
  }
}
