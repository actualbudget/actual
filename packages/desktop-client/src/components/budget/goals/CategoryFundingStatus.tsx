import { ProgressBar } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgCheckmark } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useBudgetActions } from '#budget/mutations';
import { fundingQueries } from '#budget/queries';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useNotes } from '#hooks/useNotes';
import { useUndo } from '#hooks/useUndo';

type CategoryFundingStatusProps = {
  category: CategoryEntity;
  month: string;
  onFunded?: () => void;
};

export function CategoryFundingStatus({
  category,
  month,
  onFunded,
}: CategoryFundingStatusProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const { isNarrowWidth } = useResponsive();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useBudgetActions();
  const { showUndoNotification } = useUndo();
  const state = useCategoryFunding({ category, month });
  if (!state) return null;
  const { funding, isError, isFetching } = state;

  const remaining = funding?.remaining ?? 0;
  const amount = format(remaining, 'financial');
  const monthLabel = monthUtils.format(month, 'MMMM yyyy', locale);
  const progress =
    funding && funding.recommended > 0
      ? Math.max(0, Math.min(1, 1 - funding.remaining / funding.recommended))
      : 0;

  async function fund() {
    try {
      const result = await mutateAsync({
        month,
        type: 'fund-category',
        args: { category: category.id },
      });
      await queryClient.invalidateQueries({ queryKey: fundingQueries.all() });
      if (result && 'funded' in result && result.funded) {
        showUndoNotification({ message: t('Budget automation applied.') });
        onFunded?.();
      }
    } catch {
      // useBudgetActions displays the normal budget mutation error notification.
    }
  }

  return (
    <View
      data-testid="category-funding-status"
      aria-live="polite"
      aria-busy={isFetching}
      onKeyDown={event => {
        // Fund owns its keyboard interaction even when a budget cell is editing.
        if (['Enter', ' ', 'Tab'].includes(event.key)) {
          event.stopPropagation();
        }
      }}
      style={{
        width: isNarrowWidth ? '100%' : 320,
        maxWidth: 'calc(100vw - 32px)',
        gap: 12,
        padding: 16,
        fontSize: 13,
        textAlign: 'left',
        color: isError
          ? theme.pageTextLight
          : remaining > 0
            ? theme.warningTextDark
            : theme.noticeText,
        borderBottom: '1px solid ' + theme.tableBorder,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontWeight: 600, color: theme.pageText }}>
          <Trans>Budget goal</Trans>
        </Text>
        <Text style={{ color: theme.pageTextLight }}>{monthLabel}</Text>
      </View>
      {!isError && funding && (
        <>
          {funding.recommended > 0 && (
            <ProgressBar
              value={Math.round(progress * 100)}
              aria-label={t('Goal funding progress')}
            >
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.pillBackground,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    backgroundColor:
                      remaining > 0 ? theme.warningText : theme.noticeText,
                  }}
                />
              </View>
            </ProgressBar>
          )}
          <View style={{ gap: 8, color: theme.pageText }}>
            {[
              {
                label: t('Recommended this month'),
                value: funding.recommended,
              },
              { label: t('Assigned so far'), value: funding.budgeted },
              { label: t('Still needed'), value: remaining },
            ].map(({ label, value }) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <Text>{label}</Text>
                <PrivacyFilter>
                  <FinancialText>{format(value, 'financial')}</FinancialText>
                </PrivacyFilter>
              </View>
            ))}
          </View>
        </>
      )}
      {isError ? (
        <Tooltip
          content={t("Check this category's budget automation and try again.")}
        >
          <Text>
            <Trans>Automation unavailable</Trans>
          </Text>
        </Tooltip>
      ) : remaining > 0 ? (
        <>
          <PrivacyFilter>
            <Text style={styles.tnum}>
              <Trans>{{ amount }} needed</Trans>
            </Text>
          </PrivacyFilter>
          <Tooltip
            content={t(
              'Add the full amount needed to this category. This can increase the overbudgeted amount.',
            )}
          >
            <Button
              variant="primary"
              aria-label={t(
                'Assign money to underfunded goal: {{category}} for {{month}}',
                {
                  category: category.name,
                  month: monthLabel,
                },
              )}
              isDisabled={isPending}
              onPress={() => {
                void fund();
              }}
              style={{
                padding: '8px 12px',
                minHeight: 44,
                width: '100%',
                whiteSpace: 'normal',
              }}
            >
              <Trans>Assign money to underfunded goal</Trans>
            </Button>
          </Tooltip>
        </>
      ) : isFetching ? (
        <Text>
          <Trans>Updating…</Trans>
        </Text>
      ) : funding && funding.recommended <= 0 ? (
        <Text>
          <Trans>No funding needed</Trans>
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <SvgCheckmark aria-hidden="true" width={12} height={12} />
          <Text>
            <Trans>Funded</Trans>
          </Text>
        </View>
      )}
    </View>
  );
}

export function useCategoryFunding({
  category,
  month,
}: {
  category?: CategoryEntity;
  month?: string;
}) {
  const isEnabled = useFeatureFlag('goalTemplatesEnabled');
  const notes = useNotes(isEnabled && category ? category.id : '');
  const hasTemplates =
    isEnabled &&
    !!category &&
    !!month &&
    (!!category.goal_def || !!notes?.includes('#template'));
  const { data, isError, isFetching } = useQuery({
    ...fundingQueries.category(month ?? '', category?.id ?? ''),
    enabled: hasTemplates,
    retry: false,
  });
  return hasTemplates && (data || isError)
    ? { funding: data, isError, isFetching }
    : null;
}
