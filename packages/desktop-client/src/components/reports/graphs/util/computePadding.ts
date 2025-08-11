/**
 * Calculates the left padding needed for chart axis based on formatted number length
 * @param values Array of numeric values
 * @param formatter Function to format numbers to strings
 * @returns Padding amount in pixels
 */
export function computePadding(
  values: number[],
  formatter: (value: number) => string,
) {
  if (values.length === 0) {
    return 0;
  }

  const maxLength = Math.max(
    ...values.map(value => {
      return formatter(Math.round(value)).length;
    }),
  );
  return Math.max(0, (maxLength - 5) * 5);
}
