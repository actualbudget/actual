type subfieldFromFilterProps = {
  field: string;
  value: string | number;
  options?: { inflow: any; outflow: any };
};

export function subfieldFromFilter({
  field,
  options,
  value,
}: subfieldFromFilterProps) {
  if (typeof value === 'number') {
    return field;
  } else if (field === 'date') {
    if (value.length === 7) {
      return 'month';
    } else if (value.length === 4) {
      return 'year';
    }
  } else if (field === 'amount') {
    if (options && options.inflow) {
      return 'amount-inflow';
    } else if (options && options.outflow) {
      return 'amount-outflow';
    }
  }
  return field;
}
