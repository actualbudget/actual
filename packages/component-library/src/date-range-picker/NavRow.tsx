import { Button } from '#Button';
import { SvgCheveronLeft, SvgCheveronRight } from '#icons/v1';
import { Text } from '#Text';
import { View } from '#View';

type NavRowProps = {
  label: string;
  previousLabel: string;
  nextLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function NavRow({
  label,
  previousLabel,
  nextLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: NavRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <Button
        aria-label={previousLabel}
        variant="bare"
        isDisabled={!canPrev}
        onPress={onPrev}
      >
        <SvgCheveronLeft width={16} height={16} />
      </Button>
      <Text style={{ fontWeight: 'bold' }}>{label}</Text>
      <Button
        aria-label={nextLabel}
        variant="bare"
        isDisabled={!canNext}
        onPress={onNext}
      >
        <SvgCheveronRight width={16} height={16} />
      </Button>
    </View>
  );
}
