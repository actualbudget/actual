import { getNormalisedString } from 'loot-core/shared/normalisation';

/**
 * Returns a numeric rank for how well `name` matches `input`.
 * Lower values = better match (convention used by `.sort()`).
 *
 * -4  Exact match (normalised)
 * -3  Prefix match (name starts with input)
 * -2  Word-boundary match (a non-first word starts with input)
 * -1  Contains match (input found anywhere)
 *  0  No match
 */
export function rankAutocompleteMatch(name: string, input: string): number {
  if (!input) {
    return 0;
  }

  const normName = getNormalisedString(name);
  const normInput = getNormalisedString(input);

  if (normName === normInput) {
    return -4;
  }

  if (normName.startsWith(normInput)) {
    return -3;
  }

  // Check if any non-first word starts with the input.
  // Words are split on whitespace and hyphens.
  const words = normName.split(/[\s-]/);
  for (let i = 1; i < words.length; i++) {
    if (words[i].startsWith(normInput)) {
      return -2;
    }
  }

  if (normName.includes(normInput)) {
    return -1;
  }

  return 0;
}
