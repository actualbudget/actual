import { getNormalisedString } from 'loot-core/src/shared/normalisation';

export function normalise(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return getNormalisedString(value);
}
