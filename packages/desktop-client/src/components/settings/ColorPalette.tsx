import { View } from '@actual-app/components/view';

const DEFAULT_COLORS = ['#ccc', '#999', '#666', '#333', '#111', '#000'];

type ColorPaletteProps = {
  colors?: string[];
};

export function ColorPalette({ colors }: ColorPaletteProps) {
  // Default fallback colors if not provided
  const paletteColors = colors ?? DEFAULT_COLORS;

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        width: '100%',
        height: 60,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {paletteColors.slice(0, 6).map((color, i) => (
        <div key={i} data-swatch style={{ backgroundColor: color }} />
      ))}
    </View>
  );
}
