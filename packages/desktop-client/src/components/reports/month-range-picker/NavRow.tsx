import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

type NavRowProps = {
  label: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function NavRow({
  label,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: NavRowProps) {
  const { t } = useTranslation();
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
        aria-label={t('Previous')}
        variant="bare"
        isDisabled={!canPrev}
        onPress={onPrev}
      >
        <SvgCheveronLeft width={16} height={16} />
      </Button>
      <Text style={{ fontWeight: 'bold' }}>{label}</Text>
      <Button
        aria-label={t('Next')}
        variant="bare"
        isDisabled={!canNext}
        onPress={onNext}
      >
        <SvgCheveronRight width={16} height={16} />
      </Button>
    </View>
  );
}
