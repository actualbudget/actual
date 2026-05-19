import React, { useContext } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgChartPie } from '@actual-app/components/icons/v1';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models';
import type { Template } from '@actual-app/core/types/models/templates';
import { css, cx } from '@emotion/css';

import {
  cleanupDefToEditor,
  emptyCleanupConfig,
} from '#components/budget/goals/cleanupModel';
import type { CleanupConfig } from '#components/budget/goals/cleanupModel';
import { MonthsContext } from '#components/budget/MonthsContext';
import { migrateTemplatesToAutomations } from '#components/modals/BudgetAutomationsModal/migrateTemplatesToAutomations';
import { useCategories } from '#hooks/useCategories';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import type { AutomationEntry } from './automationExamples';
import { TemplateSentence } from './TemplateSentence';

function getAutomationEntries(
  goalDef: string | null | undefined,
): AutomationEntry[] {
  if (!goalDef) {
    return [];
  }
  try {
    const parsed = JSON.parse(goalDef);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const templates: Template[] = parsed;
    return migrateTemplatesToAutomations(
      templates.filter(template => template.type !== 'error'),
    );
  } catch {
    return [];
  }
}

function getCleanupConfig(
  cleanupDef: string | null | undefined,
): CleanupConfig {
  if (!cleanupDef) {
    return emptyCleanupConfig();
  }
  try {
    const parsed = JSON.parse(cleanupDef);
    return cleanupDefToEditor(Array.isArray(parsed) ? parsed : []);
  } catch {
    return emptyCleanupConfig();
  }
}

type CategoryAutomationButtonProps = {
  category: CategoryEntity;
  width?: number;
  height?: number;
  defaultColor?: string;
  style?: CSSProperties;
  showPlaceholder?: boolean;
};
export function CategoryAutomationButton({
  category,
  width = 12,
  height = 12,
  defaultColor = theme.buttonNormalText,
  style,
  showPlaceholder = false,
}: CategoryAutomationButtonProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const monthsContext = useContext(MonthsContext);
  const month = monthsContext?.months?.[0];

  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const { data: categoriesData } = useCategories();
  const hasAutomations =
    category.template_settings?.source === 'ui' &&
    (!!category.goal_def?.length || !!category.cleanup_def?.length);

  if (!goalTemplatesEnabled || !goalTemplatesUIEnabled) {
    return null;
  }

  // Income categories don't accept templates in envelope budgets (only the
  // tracking budget runs templates against income categories).
  if (category.is_income && budgetType !== 'tracking') {
    return null;
  }

  const automations = getAutomationEntries(category.goal_def);
  const categoryNameMap: Record<string, string> = {};
  for (const cat of categoriesData?.list ?? []) {
    categoryNameMap[cat.id] = cat.name;
  }

  const cleanup = getCleanupConfig(category.cleanup_def);
  const cleanupGlobal = cleanup.global.send || cleanup.global.take;
  const cleanupScopeCount =
    (cleanupGlobal ? 1 : 0) +
    cleanup.groups.filter(group => group.send || group.take).length;

  const button = (
    <Button
      variant="bare"
      aria-label={t('Change category automations')}
      className={cx(
        !hasAutomations && !showPlaceholder ? 'hover-visible' : '',
        css({
          color: defaultColor,
          opacity: hasAutomations || !showPlaceholder ? 1 : 0.3,
          '&:hover': {
            opacity: 1,
          },
          ...style,
        }),
      )}
      onPress={() => {
        dispatch(
          pushModal({
            modal: {
              name: 'category-automations-edit',
              options: { categoryId: category.id, month },
            },
          }),
        );
      }}
    >
      <SvgChartPie style={{ width, height, flexShrink: 0 }} />
    </Button>
  );

  if (automations.length === 0 && cleanupScopeCount === 0) {
    return button;
  }

  return (
    <Tooltip
      placement="bottom start"
      content={
        <View style={{ maxWidth: 320, gap: 8 }}>
          {automations.map(entry => (
            <View key={entry.id} style={{ gap: 2 }}>
              <Text style={{ display: 'block', fontSize: 12 }}>
                <TemplateSentence
                  template={entry.template}
                  categoryNameMap={categoryNameMap}
                />
              </Text>
              {entry.template.description && (
                <Text
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: theme.pageTextLight,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {entry.template.description}
                </Text>
              )}
            </View>
          ))}
          {cleanupScopeCount > 0 && (
            <Text style={{ display: 'block', fontSize: 12 }}>
              <Trans>End of month cleanup</Trans>,{' '}
              {cleanupScopeCount > 1 ? (
                <Trans count={cleanupScopeCount}>
                  active in {{ count: cleanupScopeCount }} scopes
                </Trans>
              ) : cleanupGlobal ? (
                <Trans>active globally</Trans>
              ) : (
                <Trans>active in a pool</Trans>
              )}
            </Text>
          )}
        </View>
      }
    >
      {button}
    </Tooltip>
  );
}
