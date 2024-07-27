import { getNormalisedString } from '../../../shared/normalisation';

export function normalise(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return getNormalisedString(value);
}
