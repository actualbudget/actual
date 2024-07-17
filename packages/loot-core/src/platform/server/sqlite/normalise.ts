import { getNormalisedString } from '../../../shared/normalisation';

export function normalise(value: string | null): string {
  if (!value) {
    return null;
  }

  return getNormalisedString(value);
}
