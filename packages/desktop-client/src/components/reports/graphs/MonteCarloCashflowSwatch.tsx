import { View } from '@actual-app/components/view';

type MonteCarloCashflowSwatchProps = {
  color: string;
  size?: number;
};

/** The colour square that identifies a series in the cashflow chart's legend and tooltip */
export function MonteCarloCashflowSwatch({
  color,
  size = 10,
}: MonteCarloCashflowSwatchProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 2,
        flexShrink: 0,
        backgroundColor: color,
      }}
    />
  );
}
