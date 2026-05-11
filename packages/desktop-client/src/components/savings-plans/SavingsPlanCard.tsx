import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgTrash } from '@actual-app/components/icons/v1';
import { SvgPencilWriteAlternate } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  calculateMonthlyContribution,
  calculateProgress,
  calculateRemainingAmount,
} from '@actual-app/core/shared/savings';
import { integerToCurrency } from '@actual-app/core/shared/util';
import type { SavingsPlanEntity } from '@actual-app/core/types/models';

type SavingsPlanCardProps = {
  plan: SavingsPlanEntity;
  onEdit: (plan: SavingsPlanEntity) => void;
  onDelete: (id: SavingsPlanEntity['id']) => void;
};

export function SavingsPlanCard({
  plan,
  onEdit,
  onDelete,
}: SavingsPlanCardProps) {
  const { t } = useTranslation();
  const progress = calculateProgress(plan.target_amount, plan.saved_amount);
  const remaining = calculateRemainingAmount(
    plan.target_amount,
    plan.saved_amount,
  );
  const monthly = calculateMonthlyContribution(remaining, plan.months);
  const percentage = Math.round(progress * 100);

  return (
    <View
      style={{
        backgroundColor: theme.cardBackground,
        borderRadius: 8,
        border: `1px solid ${theme.cardBorder}`,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: theme.pageText,
          }}
        >
          {plan.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Button
            variant="bare"
            aria-label={t('Edit savings plan')}
            onPress={() => onEdit(plan)}
          >
            <SvgPencilWriteAlternate
              style={{ width: 14, height: 14, color: theme.pageTextSubdued }}
            />
          </Button>
          <Button
            variant="bare"
            aria-label={t('Delete savings plan')}
            onPress={() => onDelete(plan.id)}
          >
            <SvgTrash
              style={{ width: 14, height: 14, color: theme.errorText }}
            />
          </Button>
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: theme.tableRowBackgroundHover,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${percentage}%`,
            borderRadius: 4,
            backgroundColor:
              percentage >= 100
                ? theme.noticeTextDark
                : theme.buttonPrimaryBackground,
            transition: 'width 0.3s ease',
          }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: theme.pageTextSubdued }}>
          {percentage}% {t('complete')}
        </Text>
        {plan.status === 'completed' && (
          <Text
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: theme.noticeTextDark,
              textTransform: 'uppercase',
            }}
          >
            <Trans>Completed</Trans>
          </Text>
        )}
      </View>

      <View
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}
      >
        <StatItem
          label={t('Target')}
          value={integerToCurrency(plan.target_amount)}
        />
        <StatItem
          label={t('Saved')}
          value={integerToCurrency(plan.saved_amount)}
        />
        <StatItem label={t('Remaining')} value={integerToCurrency(remaining)} />
        <StatItem label={t('Monthly')} value={integerToCurrency(monthly)} />
        <StatItem label={t('Months')} value={String(plan.months)} />
        {plan.start_month && (
          <StatItem label={t('Start')} value={plan.start_month} />
        )}
      </View>
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          color: theme.pageTextSubdued,
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.pageText,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
