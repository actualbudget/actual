import React from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

import { ReportCardValueSkeleton } from './ReportCardValueSkeleton';

const FONT_SIZE_SCALE_FACTOR = 1.6;
const CONTAINER_MARGIN = 8;

type SummaryNumberProps = {
  value: number;
  contentType: string;
  suffix?: string;
  loading?: boolean;
};

export function SummaryNumber({
  value,
  contentType,
  suffix = '',
  loading = true,
}: SummaryNumberProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const isNumericValue = Number.isFinite(value);

  let displayAmount =
    contentType === 'percentage'
      ? format(Math.abs(value), 'number')
      : format(Math.abs(Math.round(value)), 'financial');

  displayAmount += suffix;

  const fontSize = `min(${(FONT_SIZE_SCALE_FACTOR * 100) / displayAmount.length}cqi, calc(100cqb - ${CONTAINER_MARGIN * 2}px))`;

  return (
    <>
      {loading && <ReportCardValueSkeleton />}
      {!loading && (
        <View
          aria-label={
            !isNumericValue
              ? t('Unknown amount')
              : value === 0
                ? t('Zero amount')
                : value < 0
                  ? t('Negative amount: {{amount}}', { amount: displayAmount })
                  : t('Positive amount: {{amount}}', { amount: displayAmount })
          }
          style={{
            alignItems: 'center',
            flexGrow: 1,
            flexShrink: 1,
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            containerType: 'size',
            margin: `${CONTAINER_MARGIN}px 0`,
            justifyContent: 'center',
            color: !isNumericValue
              ? theme.reportsNumberNeutral
              : value === 0
                ? theme.reportsNumberNeutral
                : value < 0
                  ? theme.reportsNumberNegative
                  : theme.reportsNumberPositive,
          }}
        >
          <FinancialText aria-hidden="true" style={{ fontSize, lineHeight: 1 }}>
            <PrivacyFilter>{displayAmount}</PrivacyFilter>
          </FinancialText>
        </View>
      )}
    </>
  );
}
