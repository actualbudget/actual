import { getNormalisedString } from '../../../../../desktop-client/src/util/normalisation';

export function normalise(value: string | null): string {
  if (!value) {
    return null;
  }

  return getNormalisedString(value);
}
