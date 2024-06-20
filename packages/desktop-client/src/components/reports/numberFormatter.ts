type PotentialNumber = number | string | undefined | null;

export const numberFormatterTooltip = (
  value: PotentialNumber,
): number | null => {
  if (typeof value === 'number') {
    return Math.round(value);
  }
  return null; // or some default value for other cases
};
