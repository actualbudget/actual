import { useTranslation } from 'react-i18next';
import type { TooltipRenderProps } from 'react-joyride';

import { SvgDelete } from '@actual-app/components/icons/v0';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { TourTooltipButton } from './TourTooltipButton';

export function TourTooltip({
  backProps,
  closeProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const { t } = useTranslation();

  return (
    <View
      {...tooltipProps}
      data-testid="tour-tooltip"
      style={{
        backgroundColor: theme.menuBackground,
        borderRadius: 8,
        color: theme.pageText,
        maxWidth: 360,
        padding: 16,
        ...styles.shadowLarge,
      }}
    >
      <TourTooltipButton
        handleProps={closeProps}
        style={{
          color: theme.pageTextSubdued,
          padding: 6,
          position: 'absolute',
          right: 8,
          top: 8,
        }}
      >
        <SvgDelete style={{ width: 9, height: 9 }} />
      </TourTooltipButton>

      {step.title != null && (
        <Text
          style={{
            ...styles.mediumText,
            fontWeight: 700,
            marginBottom: 8,
            paddingRight: 24,
          }}
        >
          {step.title}
        </Text>
      )}

      <Text style={{ lineHeight: '1.4em' }}>{step.content}</Text>

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 10,
          marginTop: 14,
        }}
      >
        <Text style={{ color: theme.pageTextSubdued, flex: 1 }}>
          {t('{{current}} of {{total}}', {
            current: index + 1,
            total: size,
          })}
        </Text>
        {!isLastStep && (
          <TourTooltipButton
            handleProps={skipProps}
            style={{ color: theme.pageTextSubdued }}
          />
        )}
        {index > 0 && <TourTooltipButton handleProps={backProps} />}
        <TourTooltipButton handleProps={primaryProps} variant="primary" />
      </View>
    </View>
  );
}
