import type { ReactNode } from 'react';

type SeriesLabelProps = {
  color: string;
  children: ReactNode;
};

export function SeriesLabel({ color, children }: SeriesLabelProps) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          width: 10,
          height: 10,
          backgroundColor: color,
          display: 'inline-block',
        }}
      />
      {children}
    </span>
  );
}
