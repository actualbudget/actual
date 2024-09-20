import { useMemo, type ReactNode } from 'react';

const interleaveArrays = (...arrays: ReactNode[][]) =>
  Array.from(
    {
      length: Math.max(...arrays.map(array => array.length)),
    },
    (_, i) => arrays.map(array => array[i]),
  ).flat();

export function useFormatList(values: ReactNode[], lng: string, opt = {}) {
  const formatter = useMemo(
    () =>
      new Intl.ListFormat(lng, {
        style: 'long',
        type: 'conjunction',
        ...opt,
      }),
    [lng, opt],
  );

  const parts = useMemo(() => {
    const placeholders = Array.from(
      { length: values.length },
      (_, i) => `<${i}>`,
    );
    const formatted = formatter.format(placeholders);
    return formatted.split(/<\d+>/g);
  }, [values.length, formatter]);

  return interleaveArrays(parts, values);
}
