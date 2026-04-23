import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import {
  addMonths,
  currentMonth,
  dayFromDate,
  firstDayOfMonth,
  monthFromDate,
} from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { Template } from '@actual-app/core/types/models/templates';
import { css } from '@emotion/css';
import { t } from 'i18next';
import uniqueId from 'lodash/uniqueId';

import { Warning } from '#components/alerts';
import { displayTemplateTypes } from '#components/budget/goals/constants';
import type { DisplayTemplateType } from '#components/budget/goals/constants';
import {
  DEFAULT_PRIORITY,
  getInitialState,
  templateReducer,
} from '#components/budget/goals/reducer';
import {
  ActiveEditor,
  AutomationErrorDetail,
  AutomationErrorShort,
  AutomationErrorTitle,
  formatMonthLabel,
  getDisplayTemplateMeta,
  GlobalConflictDetail,
  GlobalConflictTitle,
  TemplateSentence,
  validateAutomation,
} from '#components/budget/goals/templateHelpers';
import type {
  AutomationErrorKind,
  GlobalConflictKind,
} from '#components/budget/goals/templateHelpers';
import { useBudgetAutomationCategories } from '#components/budget/goals/useBudgetAutomationCategories';
import { Link } from '#components/common/Link';
import { Modal } from '#components/common/Modal';
import { useBudgetAutomations } from '#hooks/useBudgetAutomations';
import { useCategory } from '#hooks/useCategory';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useNotes } from '#hooks/useNotes';
import { useSchedules } from '#hooks/useSchedules';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type AutomationEntry = {
  id: string;
  template: Template;
  displayType: DisplayTemplateType;
};

const MODAL_WIDTH = 960;
const MODAL_HEIGHT = 760;
const RULE_LIST_WIDTH = 310;

function getDisplayTypeFromTemplate(template: Template): DisplayTemplateType {
  switch (template.type) {
    case 'percentage':
      return 'percentage';
    case 'schedule':
      return 'schedule';
    case 'periodic':
    case 'simple':
      return 'week';
    case 'limit':
      return 'limit';
    case 'refill':
      return 'refill';
    case 'average':
    case 'copy':
      return 'historical';
    case 'by':
      return 'by';
    case 'remainder':
      return 'remainder';
    default:
      return 'week';
  }
}

function createAutomationEntry(
  template: Template,
  displayType: DisplayTemplateType,
): AutomationEntry {
  return {
    id: uniqueId('automation-'),
    template,
    displayType,
  };
}

export function migrateTemplatesToAutomations(
  templates: Template[],
): AutomationEntry[] {
  const entries: AutomationEntry[] = [];

  templates.forEach(template => {
    if (template.type === 'simple') {
      let hasExpandedTemplate = false;
      const hasMonthly = template.monthly != null && template.monthly !== 0;

      if (template.limit) {
        hasExpandedTemplate = true;
        entries.push(
          createAutomationEntry(
            {
              type: 'limit',
              amount: template.limit.amount,
              hold: template.limit.hold,
              period: template.limit.period,
              start: template.limit.start,
              directive: 'template',
              priority: null,
            },
            'limit',
          ),
        );
        // The implicit refill only applies to a limit-only simple template
        // (e.g. `#template up to 200`). When a monthly amount is also set
        // (`#template 50 up to 200`), the engine just budgets the monthly
        // amount and clamps to the cap — no top-up to the limit.
        if (!hasMonthly) {
          entries.push(
            createAutomationEntry(
              {
                type: 'refill',
                directive: 'template',
                priority: template.priority,
              },
              'refill',
            ),
          );
        }
      }
      if (template.monthly != null && template.monthly !== 0) {
        hasExpandedTemplate = true;
        entries.push(
          createAutomationEntry(
            {
              type: 'periodic',
              amount: template.monthly,
              period: { period: 'month', amount: 1 },
              starting: dayFromDate(firstDayOfMonth(new Date())),
              directive: 'template',
              priority: template.priority,
            },
            'week',
          ),
        );
      }

      if (!hasExpandedTemplate) {
        entries.push(
          createAutomationEntry(template, getDisplayTypeFromTemplate(template)),
        );
      }
      return;
    }

    entries.push(
      createAutomationEntry(template, getDisplayTypeFromTemplate(template)),
    );
  });

  return entries;
}

function BudgetAutomationMigrationWarning({
  categoryId,
  style,
}: {
  categoryId: string;
  style?: CSSProperties;
}) {
  const notes = useNotes(categoryId);

  if (!notes) return null;
  const templates = notes
    .split('\n')
    .flatMap(line => {
      if (line.trim().startsWith('#template')) return line;
      if (line.trim().startsWith('#goal')) return line;
      if (line.trim().startsWith('#cleanup')) return line;
      return [];
    })
    .join('\n');

  if (!templates) return null;

  return (
    <Warning
      style={{
        padding: '8px 12px',
        fontSize: 12,
        ...style,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text>
          <Trans>
            Imported from notes-based templates. Review and Save to complete the
            migration.
          </Trans>
        </Text>
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 11, opacity: 0.85 }}>
            <Trans>Show original templates</Trans>
          </summary>
          <View
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: 11,
              marginTop: 6,
              padding: 8,
              borderRadius: 4,
              // Translucent overlay rather than a theme token so the inset
              // effect works regardless of the surrounding Warning colour
              // (which differs between light/dark/midnight themes).
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            {templates}
          </View>
        </details>
      </View>
    </Warning>
  );
}

type EmptyStateProps = {
  onAdd: (create: () => AutomationEntry) => void;
};

type AutomationExample = {
  key: string;
  label: ReactNode;
  ariaLabel: string;
  description: ReactNode;
  icon: ReactNode;
  create: () => AutomationEntry;
};

function getAutomationExamples(): AutomationExample[] {
  const renderMetaIcon = (type: DisplayTemplateType) => {
    const Icon = getDisplayTemplateMeta(type).icon;
    return <Icon width={16} height={16} />;
  };
  return [
    {
      key: 'fixed-amount',
      label: <Trans>A fixed amount each month</Trans>,
      ariaLabel: t('A fixed amount each month'),
      description: (
        <Trans>Set the same amount aside every month, no matter what.</Trans>
      ),
      icon: renderMetaIcon('week'),
      create: () =>
        createAutomationEntry(
          {
            directive: 'template',
            type: 'periodic',
            amount: 100,
            period: { period: 'month', amount: 1 },
            starting: dayFromDate(firstDayOfMonth(new Date())),
            priority: DEFAULT_PRIORITY,
          },
          'week',
        ),
    },
    {
      key: 'annual-goal',
      label: <Trans>Save for an annual goal</Trans>,
      ariaLabel: t('Save for an annual goal'),
      description: (
        <Trans>Save up by a target month; the engine spreads the load.</Trans>
      ),
      icon: renderMetaIcon('by'),
      create: () =>
        createAutomationEntry(
          {
            directive: 'template',
            type: 'by',
            amount: 1200,
            // Always 12 months out so users in late-year months don't get a
            // target that's already passed.
            month: addMonths(monthFromDate(new Date()), 12),
            annual: true,
            repeat: 1,
            priority: DEFAULT_PRIORITY,
          },
          'by',
        ),
    },
    {
      key: 'recurring-schedule',
      label: <Trans>Cover a scheduled transaction</Trans>,
      ariaLabel: t('Cover a scheduled transaction'),
      description: (
        <Trans>
          Link to a schedule and this category saves enough each month.
        </Trans>
      ),
      icon: renderMetaIcon('schedule'),
      create: () =>
        createAutomationEntry(
          {
            directive: 'template',
            type: 'schedule',
            name: '',
            priority: DEFAULT_PRIORITY,
          },
          'schedule',
        ),
    },
  ];
}

function EmptyState({ onAdd }: EmptyStateProps) {
  const examples = getAutomationExamples();

  return (
    <View
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        maxWidth: 540,
        margin: '0 auto',
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          margin: '0 auto 14px',
          backgroundColor: theme.upcomingBackground,
          color: theme.pageTextPositive,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SvgAlertTriangle width={20} height={20} style={{ color: 'inherit' }} />
      </View>
      <Text
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: theme.pageText,
          letterSpacing: '-0.01em',
        }}
      >
        <Trans>No automations yet</Trans>
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: theme.pageTextSubdued,
          marginTop: 4,
          marginBottom: 22,
          display: 'block',
        }}
      >
        <Trans>
          Budget automations keep this category funded without you touching it
          each month. Start with one of these.
        </Trans>
      </Text>
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
          textAlign: 'left',
        }}
      >
        {examples.map(example => (
          <View
            key={example.key}
            role="button"
            tabIndex={0}
            aria-label={example.ariaLabel}
            onClick={() => onAdd(example.create)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAdd(example.create);
              }
            }}
            style={{
              padding: 14,
              borderRadius: 8,
              backgroundColor: theme.cardBackground,
              border: `1px solid ${theme.tableBorder}`,
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                backgroundColor: theme.upcomingBackground,
                color: theme.pageTextPositive,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {example.icon}
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.pageText,
              }}
            >
              {example.label}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: theme.pageTextSubdued,
                lineHeight: 1.4,
              }}
            >
              {example.description}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type AutomationListRowProps = {
  index: number;
  entry: AutomationEntry;
  isActive: boolean;
  error: AutomationErrorKind | null;
  contribution: number | null;
  categoryNameMap: Record<string, string>;
  onSelect: (index: number) => void;
};

function AutomationListRow({
  index,
  entry,
  isActive,
  error,
  contribution,
  categoryNameMap,
  onSelect,
}: AutomationListRowProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const meta = getDisplayTemplateMeta(entry.displayType);
  const Icon = meta.icon;

  const subtitle = error ? (
    <AutomationErrorShort error={error} />
  ) : (
    <TemplateSentence
      template={entry.template}
      categoryNameMap={categoryNameMap}
    />
  );

  const borderColor = isActive
    ? theme.tableBorderSelected
    : error
      ? theme.errorBorder
      : 'transparent';
  const backgroundColor = isActive
    ? theme.upcomingBackground
    : error
      ? theme.errorBackground
      : 'transparent';
  const titleColor = error ? theme.errorText : theme.pageText;
  const subtitleColor = error ? theme.errorText : theme.pageTextSubdued;
  const priority =
    'priority' in entry.template && typeof entry.template.priority === 'number'
      ? entry.template.priority
      : null;

  return (
    <View
      onClick={() => onSelect(index)}
      aria-label={t('Select automation')}
      style={{
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        marginBottom: 4,
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        backgroundColor,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: error
            ? theme.errorBackground
            : isActive
              ? theme.upcomingBackground
              : theme.pillBackground,
          color: error
            ? theme.errorText
            : isActive
              ? theme.pageTextPositive
              : theme.pageTextSubdued,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon width={14} height={14} style={{ color: 'inherit' }} />
      </View>
      <View style={{ minWidth: 0, flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: titleColor,
          }}
        >
          <Text>{meta.label}</Text>
          {error && (
            <SvgAlertTriangle
              width={11}
              height={11}
              style={{ color: 'inherit' }}
            />
          )}
        </View>
        <Text
          style={{
            fontSize: 11,
            color: subtitleColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          flexShrink: 0,
          alignItems: 'flex-end',
          gap: 2,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color:
              contribution == null ||
              Number.isNaN(contribution) ||
              contribution === 0
                ? theme.pageTextSubdued
                : theme.pageText,
          }}
        >
          {contribution == null || Number.isNaN(contribution)
            ? '—'
            : contribution > 0
              ? '+' + format(contribution, 'financial')
              : format(contribution, 'financial')}
        </Text>
        {priority != null && (
          <Text
            style={{
              fontSize: 10,
              color: theme.pageTextSubdued,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.04em',
            }}
          >
            {t('P{{priority}}', { priority })}
          </Text>
        )}
      </View>
    </View>
  );
}

const ALWAYS_SCROLL_CLASS = css({
  scrollbarGutter: 'stable',
  '&::-webkit-scrollbar': {
    width: 11,
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    width: 7,
    minHeight: 24,
    borderRadius: 30,
    backgroundClip: 'padding-box',
    border: '2px solid rgba(0, 0, 0, 0)',
    backgroundColor: theme.tableBorder,
  },
});

const CONFIG_PANEL_CLASS = css({
  '& > *:first-child': {
    marginTop: 0,
  },
  '& span > label': {
    fontSize: 11,
    fontWeight: 600,
    color: theme.pageTextSubdued,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  // Match Select borders to text inputs (Button uses buttonNormalBorder which
  // is brighter than formInputBorder in dark/midnight themes).
  '& button[type="button"]:not([aria-pressed])': {
    borderColor: theme.formInputBorder,
  },
});

const SINGLETON_TYPES: ReadonlySet<DisplayTemplateType> = new Set([
  'limit',
  'refill',
  'remainder',
]);

type TypePickerProps = {
  active: DisplayTemplateType;
  disabledTypes: ReadonlySet<DisplayTemplateType>;
  onPick: (type: DisplayTemplateType) => void;
};

function TypePicker({ active, disabledTypes, onPick }: TypePickerProps) {
  const entries = displayTemplateTypes.map(
    id => [id, getDisplayTemplateMeta(id)] as const,
  );

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
      }}
    >
      {entries.map(([id, meta]) => {
        const Icon = meta.icon;
        const isActive = id === active;
        const isDisabled = !isActive && disabledTypes.has(id);
        return (
          <View
            key={id}
            role="button"
            tabIndex={isDisabled ? -1 : 0}
            aria-pressed={isActive}
            aria-disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) onPick(id);
            }}
            onKeyDown={e => {
              if (isDisabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(id);
              }
            }}
            style={{
              padding: '10px 10px 8px',
              borderRadius: 6,
              backgroundColor: isActive
                ? theme.upcomingBackground
                : theme.cardBackground,
              border: `1px solid ${isActive ? theme.pageTextPositive : theme.tableBorder}`,
              gap: 6,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.45 : 1,
              minWidth: 0,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon
                width={16}
                height={16}
                style={{
                  flexShrink: 0,
                  color: isActive ? theme.pageTextPositive : theme.pageText,
                }}
              />
              <Text
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? theme.pageTextPositive : theme.pageText,
                  lineHeight: 1.25,
                }}
              >
                {meta.label}
              </Text>
            </View>
            <Text
              style={{
                display: 'block',
                fontSize: 11,
                color: theme.pageTextSubdued,
                lineHeight: 1.35,
              }}
            >
              {meta.description}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

type AutomationEditorPaneProps = {
  entries: AutomationEntry[];
  activeIdx: number;
  automationErrors: (AutomationErrorKind | null)[];
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  hasLimitAutomation: boolean;
  onAddLimitAutomation: () => void;
  setEntries: (fn: (prev: AutomationEntry[]) => AutomationEntry[]) => void;
  onDelete: (index: number) => void;
};

function AutomationEditorPane({
  entries,
  activeIdx,
  automationErrors,
  schedules,
  categories,
  hasLimitAutomation,
  onAddLimitAutomation,
  setEntries,
  onDelete,
}: AutomationEditorPaneProps) {
  const active = entries[activeIdx];
  const activeError = automationErrors[activeIdx];

  const state = active ? getInitialState(active.template) : null;

  const dispatch = (action: Parameters<typeof templateReducer>[1]) => {
    setEntries(prev =>
      prev.map((entry, i) => {
        if (i !== activeIdx) return entry;
        const current = getInitialState(entry.template);
        const next = templateReducer(current, action);
        return {
          id: entry.id,
          template: next.template,
          displayType: next.displayType,
        };
      }),
    );
  };

  const setPriority = (priority: number) => {
    setEntries(prev =>
      prev.map((entry, i) => {
        if (i !== activeIdx) return entry;
        const t = entry.template;
        switch (t.type) {
          case 'percentage':
          case 'periodic':
          case 'by':
          case 'spend':
          case 'simple':
          case 'schedule':
          case 'average':
          case 'copy':
          case 'refill':
            return { ...entry, template: { ...t, priority } };
          default:
            return entry;
        }
      }),
    );
  };

  const disabledTypes = new Set<DisplayTemplateType>();
  entries.forEach((entry, i) => {
    if (i !== activeIdx && SINGLETON_TYPES.has(entry.displayType)) {
      disabledTypes.add(entry.displayType);
    }
  });

  if (!active || !state) {
    return (
      <View style={{ padding: 20, color: theme.pageTextSubdued }}>
        <Trans>Select an automation on the left.</Trans>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        padding: 20,
        overflowY: 'auto',
        gap: 14,
      }}
    >
      {activeError && (
        <View
          style={{
            padding: '10px 12px',
            borderRadius: 6,
            backgroundColor: theme.errorBackground,
            border: `1px solid ${theme.errorBorder}`,
            color: theme.errorText,
            fontSize: 13,
            flexDirection: 'row',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <SvgAlertTriangle
            width={14}
            height={14}
            style={{ marginTop: 2, color: 'inherit', flexShrink: 0 }}
          />
          <View style={{ minWidth: 0 }}>
            <Text style={{ fontWeight: 600, color: 'inherit' }}>
              <AutomationErrorTitle error={activeError} />
            </Text>
            <Text
              style={{
                fontSize: 12,
                marginTop: 2,
                color: 'inherit',
                display: 'block',
              }}
            >
              <AutomationErrorDetail error={activeError} />
            </Text>
          </View>
        </View>
      )}

      <Text
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          color: theme.pageTextSubdued,
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}
      >
        <Trans>Automation type</Trans>
      </Text>
      <TypePicker
        active={state.displayType}
        disabledTypes={disabledTypes}
        onPick={type => dispatch({ type: 'set-type', payload: type })}
      />

      {state.displayType !== 'refill' && (
        <>
          <Text
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              color: theme.pageTextSubdued,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            <Trans>Configuration</Trans>
          </Text>
          <View
            className={CONFIG_PANEL_CLASS}
            style={{
              padding: 16,
              backgroundColor: theme.tableBackground,
              borderRadius: 6,
              border: `1px solid ${theme.tableBorder}`,
            }}
          >
            <ActiveEditor
              state={state}
              dispatch={dispatch}
              schedules={schedules}
              categories={categories}
              hasLimitAutomation={hasLimitAutomation}
              onAddLimitAutomation={onAddLimitAutomation}
            />
          </View>
        </>
      )}

      {state.displayType === 'refill' && (
        <ActiveEditor
          state={state}
          dispatch={dispatch}
          schedules={schedules}
          categories={categories}
          hasLimitAutomation={hasLimitAutomation}
          onAddLimitAutomation={onAddLimitAutomation}
        />
      )}

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {'priority' in state.template &&
          typeof state.template.priority === 'number' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.pageTextSubdued,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <Trans>Priority</Trans>
              </Text>
              <Input
                type="number"
                style={{ width: 64 }}
                value={String(state.template.priority)}
                onChangeValue={value => {
                  if (value === '') return;
                  const parsed = Math.round(Number(value));
                  if (Number.isNaN(parsed)) return;
                  setPriority(Math.max(0, parsed));
                }}
              />
            </View>
          )}
        <View style={{ flex: 1 }} />
        <Button
          variant="bare"
          onPress={() => onDelete(activeIdx)}
          style={{ color: theme.errorText }}
        >
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <SvgDelete width={10} height={10} style={{ color: 'inherit' }} />
            <Trans>Delete automation</Trans>
          </span>
        </Button>
      </View>
    </View>
  );
}

type ConflictBannerProps = {
  conflict: GlobalConflictKind;
};

function ConflictBanner({ conflict }: ConflictBannerProps) {
  return (
    <View
      style={{
        padding: '8px 22px',
        backgroundColor: theme.errorBackground,
        borderBottom: `1px solid ${theme.errorBorder}`,
        color: theme.errorText,
        fontSize: 12,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <SvgAlertTriangle width={14} height={14} style={{ color: 'inherit' }} />
      <Text style={{ color: 'inherit' }}>
        <strong>
          <GlobalConflictTitle conflict={conflict} />.
        </strong>{' '}
        <GlobalConflictDetail conflict={conflict} />
      </Text>
    </View>
  );
}

type BudgetAutomationsBodyProps = {
  categoryId: string;
  categoryName: string;
  needsMigration: boolean;
  initialEntries: AutomationEntry[];
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  month: string;
  onClose: () => void;
};

function BudgetAutomationsBody({
  categoryId,
  categoryName,
  needsMigration,
  initialEntries,
  schedules,
  categories,
  month,
  onClose,
}: BudgetAutomationsBodyProps) {
  const dispatch = useDispatch();
  const format = useFormat();
  const locale = useLocale();

  const [entries, setEntries] = useState<AutomationEntry[]>(initialEntries);
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dryRun, setDryRun] = useState<{
    budgeted: number;
    perTemplate: number[];
  } | null>(null);

  const onAddAutomation = (create?: () => AutomationEntry) => {
    const entry =
      create?.() ??
      createAutomationEntry(
        {
          directive: 'template',
          type: 'periodic',
          amount: 100,
          period: { period: 'month', amount: 1 },
          starting: dayFromDate(firstDayOfMonth(new Date())),
          priority: DEFAULT_PRIORITY,
        },
        'week',
      );
    setEntries(prev => {
      const next = [...prev, entry];
      setActiveIdx(next.length - 1);
      return next;
    });
  };

  const onAddLimitAutomation = () => {
    const entry = createAutomationEntry(
      {
        directive: 'template',
        type: 'limit',
        amount: 500,
        period: 'monthly',
        hold: false,
        priority: null,
      },
      'limit',
    );
    setEntries(prev => [entry, ...prev]);
    setActiveIdx(0);
  };

  const onDelete = (index: number) => {
    setEntries(prev => {
      const next = prev.filter((_, i) => i !== index);
      setActiveIdx(currentActive => {
        if (next.length === 0) return 0;
        if (currentActive >= next.length) return next.length - 1;
        if (currentActive > index) return currentActive - 1;
        return currentActive;
      });
      return next;
    });
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const templatesToSave = entries.map(({ template }) => template);
      await send('budget/set-category-automations', {
        categoriesWithTemplates: [
          { id: categoryId, templates: templatesToSave },
        ],
        source: 'ui',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const onUnmigrate = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-automations-unmigrate',
          options: {
            categoryId,
            templates: entries.map(({ template }) => template),
          },
        },
      }),
    );
  };

  const templates = entries.map(e => e.template);

  const validPercentageSources = new Set<string>([
    'total',
    'to-budget',
    'all income',
    'available funds',
  ]);
  for (const group of categories) {
    for (const cat of group.categories ?? []) {
      validPercentageSources.add(cat.id);
      if (cat.name) validPercentageSources.add(cat.name.toLowerCase());
    }
  }

  const automationErrors = entries.map(entry =>
    validateAutomation(
      entry.template,
      entry.displayType,
      templates,
      schedules,
      new Date(),
      validPercentageSources,
    ),
  );

  useEffect(() => {
    let cancelled = false;
    if (templates.length === 0) {
      setDryRun({ budgeted: 0, perTemplate: [] });
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const result = await send('budget/dry-run-category-template', {
          month,
          categoryId,
          templates,
        });
        if (!cancelled) setDryRun(result);
      } catch {
        if (!cancelled) setDryRun(null);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [templates, month, categoryId]);

  const totalMonthly = dryRun?.budgeted ?? 0;
  const contributions: (number | null)[] = entries.map((_, i) =>
    dryRun?.perTemplate?.[i] != null ? dryRun.perTemplate[i] : null,
  );
  const hasErrors = automationErrors.some(error => error !== null);
  const percentSum = templates.reduce<number>((sum, t) => {
    if (t.type === 'percentage') return sum + t.percent;
    return sum;
  }, 0);
  const conflict: GlobalConflictKind | null =
    percentSum > 100 ? { kind: 'percent-over-100', total: percentSum } : null;

  const categoryNameMap: Record<string, string> = {};
  for (const group of categories) {
    for (const cat of group.categories ?? []) {
      categoryNameMap[cat.id] = cat.name;
    }
  }

  const hasLimitAutomation = entries.some(e => e.displayType === 'limit');

  const safeActiveIdx = Math.min(activeIdx, Math.max(0, entries.length - 1));

  return (
    <View style={{ flex: 1, flexDirection: 'column', minHeight: 0 }}>
      <View
        style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${theme.tableBorder}`,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <View style={{ minWidth: 0 }}>
          <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
            <Trans>Budget automation</Trans>
          </Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: theme.pageText,
              marginTop: 2,
            }}
          >
            {categoryName}
          </Text>
        </View>
        <View style={{ textAlign: 'right', flexShrink: 0, minWidth: 220 }}>
          <Text
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              color: theme.pageTextSubdued,
              letterSpacing: '0.04em',
            }}
          >
            <Trans>
              Projected for {{ month: formatMonthLabel(month, locale) }}
            </Trans>
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: theme.pageTextPositive,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
              display: 'block',
            }}
          >
            {format(totalMonthly, 'financial')}
          </Text>
        </View>
      </View>

      {needsMigration && (
        <BudgetAutomationMigrationWarning
          categoryId={categoryId}
          style={{ flexShrink: 0, margin: '12px 24px 0' }}
        />
      )}

      {conflict && <ConflictBanner conflict={conflict} />}

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          minHeight: 0,
        }}
      >
        <View
          className={ALWAYS_SCROLL_CLASS}
          style={{
            width: RULE_LIST_WIDTH,
            borderRight: `1px solid ${theme.tableBorder}`,
            padding: 10,
            overflowY: 'scroll',
          }}
        >
          <View
            style={{
              flexShrink: 0,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 8px',
              fontSize: 11,
              textTransform: 'uppercase',
              color: theme.pageTextSubdued,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            <Text>
              <Trans>Automations</Trans>
            </Text>
          </View>
          {entries.map((entry, i) => (
            <AutomationListRow
              key={entry.id}
              index={i}
              entry={entry}
              isActive={i === safeActiveIdx}
              error={automationErrors[i]}
              contribution={contributions[i]}
              categoryNameMap={categoryNameMap}
              onSelect={setActiveIdx}
            />
          ))}
          <Button
            variant="bare"
            onPress={() => onAddAutomation()}
            style={{
              width: '100%',
              marginTop: 8,
              padding: 10,
              border: `1px dashed ${theme.tableBorder}`,
              borderRadius: 6,
              color: theme.pageTextPositive,
              fontWeight: 600,
              fontSize: 12,
              justifyContent: 'center',
            }}
          >
            <Trans>+ Add an automation</Trans>
          </Button>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          {entries.length === 0 ? (
            <EmptyState onAdd={onAddAutomation} />
          ) : (
            <AutomationEditorPane
              entries={entries}
              activeIdx={safeActiveIdx}
              automationErrors={automationErrors}
              schedules={schedules}
              categories={categories}
              hasLimitAutomation={hasLimitAutomation}
              onAddLimitAutomation={onAddLimitAutomation}
              setEntries={setEntries}
              onDelete={onDelete}
            />
          )}
        </View>
      </View>

      <View
        style={{
          padding: '12px 20px',
          borderTop: `1px solid ${theme.tableBorder}`,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          backgroundColor: theme.tableBackground,
          flexShrink: 0,
        }}
      >
        {!needsMigration && (
          <Link variant="text" onClick={onUnmigrate}>
            <Trans>Un-migrate to text notes</Trans>
          </Link>
        )}
        <View style={{ flex: 1 }} />
        <Button onPress={onClose}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          variant="primary"
          onPress={onSave}
          isDisabled={hasErrors || saving}
        >
          <Trans>Save</Trans>
        </Button>
      </View>
    </View>
  );
}

function UnsupportedDirectivesNotice({
  hasGoalTemplate,
  hasCleanupDirective,
  onClose,
}: {
  hasGoalTemplate: boolean;
  hasCleanupDirective: boolean;
  onClose: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 32,
        gap: 16,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <SvgAlertTriangle
        width={32}
        height={32}
        style={{ color: theme.errorText }}
      />
      <Text
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: theme.pageText,
        }}
      >
        <Trans>This category isn&rsquo;t supported in the UI yet</Trans>
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: theme.pageTextSubdued,
          maxWidth: 480,
          lineHeight: 1.5,
        }}
      >
        {hasGoalTemplate && hasCleanupDirective ? (
          <Trans>
            This category&rsquo;s notes use <code>#goal</code> and{' '}
            <code>#cleanup</code> directives, neither of which the budget
            automations UI handles yet. Keep editing them as text in the
            category&rsquo;s notes.
          </Trans>
        ) : hasGoalTemplate ? (
          <Trans>
            This category uses a <code>#goal</code> directive, which the budget
            automations UI doesn&rsquo;t handle yet. Keep editing it as text in
            the category&rsquo;s notes.
          </Trans>
        ) : (
          <Trans>
            This category uses a <code>#cleanup</code> directive, which the
            budget automations UI doesn&rsquo;t handle yet. Keep editing it as
            text in the category&rsquo;s notes.
          </Trans>
        )}
      </Text>
      <Button onPress={onClose}>
        <Trans>Close</Trans>
      </Button>
    </View>
  );
}

function hasCleanupLine(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return notes
    .split('\n')
    .some(line => line.trimStart().startsWith('#cleanup'));
}

export function BudgetAutomationsModal({
  categoryId,
  month,
}: {
  categoryId: string;
  month?: string;
}) {
  const [parsedTemplates, setParsedTemplates] = useState<Template[] | null>(
    null,
  );
  const effectiveMonth = month ?? currentMonth();

  const onLoaded = (result: Record<string, Template[]>) => {
    setParsedTemplates(result[categoryId] ?? []);
  };

  const { loading } = useBudgetAutomations({ categoryId, onLoaded });

  const { schedules } = useSchedules({ query: q('schedules').select('*') });

  const categories = useBudgetAutomationCategories();
  const { data: currentCategory } = useCategory(categoryId);
  const notes = useNotes(categoryId);

  const needsMigration = currentCategory?.template_settings?.source !== 'ui';

  const hasGoalTemplate =
    parsedTemplates?.some(t => t.type === 'goal') ?? false;
  const hasCleanupDirective = hasCleanupLine(notes);
  const hasUnsupportedDirective = hasGoalTemplate || hasCleanupDirective;

  const initialEntries =
    parsedTemplates && !hasUnsupportedDirective
      ? migrateTemplatesToAutomations(parsedTemplates)
      : null;

  return (
    <Modal
      name="category-automations-edit"
      containerProps={{
        style: {
          width: MODAL_WIDTH,
          maxWidth: '95vw',
          height: MODAL_HEIGHT,
          maxHeight: '90vh',
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {({ state }) => (
        <View style={{ flex: 1, minHeight: 0 }}>
          {loading || parsedTemplates === null ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatedLoading style={{ width: 20, height: 20 }} />
            </View>
          ) : hasUnsupportedDirective ? (
            <UnsupportedDirectivesNotice
              hasGoalTemplate={hasGoalTemplate}
              hasCleanupDirective={hasCleanupDirective}
              onClose={() => state.close()}
            />
          ) : (
            <BudgetAutomationsBody
              categoryId={categoryId}
              categoryName={currentCategory?.name ?? ''}
              needsMigration={needsMigration}
              initialEntries={initialEntries ?? []}
              schedules={schedules}
              categories={categories}
              month={effectiveMonth}
              onClose={() => state.close()}
            />
          )}
        </View>
      )}
    </Modal>
  );
}
