import { useCallback, useEffect, useMemo, useState } from 'react';
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
  currentMonth,
  dayFromDate,
  firstDayOfMonth,
} from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import type { Template } from '@actual-app/core/types/models/templates';
import { css } from '@emotion/css';
import uniqueId from 'lodash/uniqueId';

import { Warning } from '#components/alerts';
import type { DisplayTemplateType } from '#components/budget/goals/constants';
import {
  DEFAULT_PRIORITY,
  getInitialState,
  templateReducer,
} from '#components/budget/goals/reducer';
import {
  ActiveEditor,
  displayTemplateMeta,
  GlobalConflictDetail,
  GlobalConflictTitle,
  RuleErrorDetail,
  RuleErrorShort,
  RuleErrorTitle,
  TemplateSentence,
  validateRule,
} from '#components/budget/goals/templateHelpers';
import type {
  GlobalConflictKind,
  RuleErrorKind,
} from '#components/budget/goals/templateHelpers';
import { useBudgetAutomationCategories } from '#components/budget/goals/useBudgetAutomationCategories';
import { Link } from '#components/common/Link';
import { Modal } from '#components/common/Modal';
import { useBudgetAutomations } from '#hooks/useBudgetAutomations';
import { useCategory } from '#hooks/useCategory';
import { useFormat } from '#hooks/useFormat';
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

  const templates = useMemo(() => {
    if (!notes) return null;
    const lines = notes.split('\n');
    return lines
      .flatMap(line => {
        if (line.trim().startsWith('#template')) return line;
        if (line.trim().startsWith('#goal')) return line;
        if (line.trim().startsWith('#cleanup')) return line;
        return [];
      })
      .join('\n');
  }, [notes]);

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
  onAdd: (preset: () => AutomationEntry) => void;
};

function buildPresetSeeds(): Array<{
  key: string;
  label: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  seed: () => AutomationEntry;
}> {
  return [
    {
      key: 'fixed-amount',
      label: <Trans>A fixed amount each month</Trans>,
      description: (
        <Trans>Set the same amount aside every month, no matter what.</Trans>
      ),
      icon: <displayTemplateMeta.week.icon width={16} height={16} />,
      seed: () =>
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
      description: (
        <Trans>Save up by a target month; the engine spreads the load.</Trans>
      ),
      icon: <displayTemplateMeta.by.icon width={16} height={16} />,
      seed: () => {
        const today = new Date();
        const targetMonth = `${today.getFullYear()}-12`;
        return createAutomationEntry(
          {
            directive: 'template',
            type: 'by',
            amount: 1200,
            month: targetMonth,
            annual: true,
            repeat: 1,
            priority: DEFAULT_PRIORITY,
          },
          'by',
        );
      },
    },
    {
      key: 'recurring-schedule',
      label: <Trans>Cover a scheduled transaction</Trans>,
      description: (
        <Trans>
          Link to a schedule and this category saves enough each month.
        </Trans>
      ),
      icon: <displayTemplateMeta.schedule.icon width={16} height={16} />,
      seed: () =>
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
  const presets = useMemo(buildPresetSeeds, []);

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
        <Trans>No rules yet</Trans>
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
        {presets.map(preset => (
          <View
            key={preset.key}
            role="button"
            tabIndex={0}
            aria-label={preset.key}
            onClick={() => onAdd(preset.seed)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAdd(preset.seed);
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
              {preset.icon}
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.pageText,
              }}
            >
              {preset.label}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: theme.pageTextSubdued,
                lineHeight: 1.4,
              }}
            >
              {preset.description}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type RuleListRowProps = {
  index: number;
  entry: AutomationEntry;
  isActive: boolean;
  error: RuleErrorKind | null;
  contribution: number | null;
  categoryNameMap: Record<string, string>;
  onSelect: (index: number) => void;
};

function RuleListRow({
  index,
  entry,
  isActive,
  error,
  contribution,
  categoryNameMap,
  onSelect,
}: RuleListRowProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const meta = displayTemplateMeta[entry.displayType];
  const Icon = meta.icon;

  const subtitle = error ? (
    <RuleErrorShort error={error} />
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
      aria-label={t('Select rule {{label}}', { label: meta.label })}
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
              !contribution || contribution === 0
                ? theme.pageTextSubdued
                : theme.pageText,
          }}
        >
          {!contribution ? '—' : '+' + format(contribution, 'financial')}
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
    backgroundColor: 'rgba(200, 200, 200, .15)',
  },
  '&::-webkit-scrollbar-thumb': {
    width: 7,
    minHeight: 24,
    borderRadius: 30,
    backgroundClip: 'padding-box',
    border: '2px solid rgba(0, 0, 0, 0)',
    backgroundColor: '#b0b0b0',
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

function formatMonthLabel(monthStr: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(monthStr);
  if (!match) return monthStr;
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${names[Number(match[2]) - 1]} ${match[1]}`;
}

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
  const { t } = useTranslation();
  const entries = useMemo(
    () =>
      Object.entries(displayTemplateMeta) as Array<
        [DisplayTemplateType, (typeof displayTemplateMeta)[DisplayTemplateType]]
      >,
    [],
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
            aria-label={t(meta.label)}
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
                {t(meta.label)}
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
              {t(meta.description)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

type RuleEditorPaneProps = {
  entries: AutomationEntry[];
  activeIdx: number;
  ruleErrors: (RuleErrorKind | null)[];
  schedules: readonly ScheduleEntity[];
  categories: CategoryGroupEntity[];
  hasLimitAutomation: boolean;
  onAddLimitRule: () => void;
  setEntries: (fn: (prev: AutomationEntry[]) => AutomationEntry[]) => void;
  onDelete: (index: number) => void;
};

function RuleEditorPane({
  entries,
  activeIdx,
  ruleErrors,
  schedules,
  categories,
  hasLimitAutomation,
  onAddLimitRule,
  setEntries,
  onDelete,
}: RuleEditorPaneProps) {
  const active = entries[activeIdx];
  const activeError = ruleErrors[activeIdx];

  const state = useMemo(
    () => (active ? getInitialState(active.template) : null),
    [active],
  );

  const dispatch = useCallback(
    (action: Parameters<typeof templateReducer>[1]) => {
      setEntries(prev => {
        return prev.map((entry, i) => {
          if (i !== activeIdx) return entry;
          const current = getInitialState(entry.template);
          const next = templateReducer(current, action);
          return {
            id: entry.id,
            template: next.template,
            displayType: next.displayType,
          };
        });
      });
    },
    [activeIdx, setEntries],
  );

  const setPriority = useCallback(
    (priority: number) => {
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
    },
    [activeIdx, setEntries],
  );

  const disabledTypes = useMemo(() => {
    const used = new Set<DisplayTemplateType>();
    entries.forEach((entry, i) => {
      if (i !== activeIdx && SINGLETON_TYPES.has(entry.displayType)) {
        used.add(entry.displayType);
      }
    });
    return used;
  }, [entries, activeIdx]);

  if (!active || !state) {
    return (
      <View style={{ padding: 20, color: theme.pageTextSubdued }}>
        <Trans>Select a rule on the left.</Trans>
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
              <RuleErrorTitle error={activeError} />
            </Text>
            <Text
              style={{
                fontSize: 12,
                marginTop: 2,
                color: 'inherit',
                display: 'block',
              }}
            >
              <RuleErrorDetail error={activeError} />
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
        <Trans>Rule type</Trans>
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
              onAddLimitAutomation={onAddLimitRule}
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
          onAddLimitAutomation={onAddLimitRule}
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
            <Trans>Delete rule</Trans>
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

  const [entries, setEntries] = useState<AutomationEntry[]>(initialEntries);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dryRun, setDryRun] = useState<{
    budgeted: number;
    perTemplate: number[];
  } | null>(null);

  const onAddRule = useCallback((preset?: () => AutomationEntry) => {
    const entry =
      preset?.() ??
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
  }, []);

  const onAddLimitRule = useCallback(() => {
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
  }, []);

  const onDelete = useCallback((index: number) => {
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
  }, []);

  const onSave = useCallback(async () => {
    const templates = entries.map(({ template }) => template);
    await send('budget/set-category-automations', {
      categoriesWithTemplates: [{ id: categoryId, templates }],
      source: 'ui',
    });
    onClose();
  }, [entries, categoryId, onClose]);

  const onUnmigrate = useCallback(() => {
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
  }, [categoryId, dispatch, entries]);

  const templates = useMemo(() => entries.map(e => e.template), [entries]);
  const ruleErrors = useMemo(
    () =>
      entries.map(entry =>
        validateRule(
          entry.template,
          entry.displayType,
          templates,
          schedules,
          new Date(),
        ),
      ),
    [entries, templates, schedules],
  );

  useEffect(() => {
    let cancelled = false;
    if (entries.length === 0) {
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
  }, [templates, month, categoryId, entries.length]);

  const totalMonthly = dryRun?.budgeted ?? 0;
  const contributions = useMemo<(number | null)[]>(
    () =>
      entries.map((_, i) =>
        dryRun?.perTemplate?.[i] != null ? dryRun.perTemplate[i] : null,
      ),
    [entries, dryRun],
  );
  const hasErrors = useMemo(
    () => ruleErrors.some(error => error !== null),
    [ruleErrors],
  );
  const conflict = useMemo<GlobalConflictKind | null>(() => {
    const percentSum = templates.reduce<number>((sum, t) => {
      if (t.type === 'percentage') return sum + t.percent;
      return sum;
    }, 0);
    if (percentSum > 100) {
      return { kind: 'percent-over-100', total: percentSum };
    }
    return null;
  }, [templates]);

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const group of categories) {
      for (const cat of group.categories ?? []) {
        map[cat.id] = cat.name;
      }
    }
    return map;
  }, [categories]);

  const hasLimitAutomation = useMemo(
    () => entries.some(e => e.displayType === 'limit'),
    [entries],
  );

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
            <Trans>Projected for {{ month: formatMonthLabel(month) }}</Trans>
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
              <Trans>Rules</Trans>
            </Text>
          </View>
          {entries.map((entry, i) => (
            <RuleListRow
              key={entry.id}
              index={i}
              entry={entry}
              isActive={i === safeActiveIdx}
              error={ruleErrors[i]}
              contribution={contributions[i]}
              categoryNameMap={categoryNameMap}
              onSelect={setActiveIdx}
            />
          ))}
          <Button
            variant="bare"
            onPress={() => onAddRule()}
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
            <Trans>+ Add a rule</Trans>
          </Button>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          {entries.length === 0 ? (
            <EmptyState onAdd={onAddRule} />
          ) : (
            <RuleEditorPane
              entries={entries}
              activeIdx={safeActiveIdx}
              ruleErrors={ruleErrors}
              schedules={schedules}
              categories={categories}
              hasLimitAutomation={hasLimitAutomation}
              onAddLimitRule={onAddLimitRule}
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
        <Button variant="primary" onPress={onSave} isDisabled={hasErrors}>
          <Trans>Save</Trans>
        </Button>
      </View>
    </View>
  );
}

export function BudgetAutomationsModal({
  categoryId,
  month,
}: {
  categoryId: string;
  month?: string;
}) {
  const [entries, setEntries] = useState<AutomationEntry[] | null>(null);
  const effectiveMonth = month ?? currentMonth();

  const onLoaded = useCallback(
    (result: Record<string, Template[]>) => {
      const templates = result[categoryId] ?? [];
      setEntries(migrateTemplatesToAutomations(templates));
    },
    [categoryId],
  );

  const { loading } = useBudgetAutomations({ categoryId, onLoaded });

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const { schedules } = useSchedules({ query: schedulesQuery });

  const categories = useBudgetAutomationCategories();
  const { data: currentCategory } = useCategory(categoryId);

  const needsMigration = currentCategory?.template_settings?.source !== 'ui';

  return (
    <Modal
      name="category-automations-edit"
      containerProps={{
        style: {
          width: MODAL_WIDTH,
          height: MODAL_HEIGHT,
          padding: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {({ state }) => (
        <View style={{ flex: 1, minHeight: 0 }}>
          {loading || entries === null ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatedLoading style={{ width: 20, height: 20 }} />
            </View>
          ) : (
            <BudgetAutomationsBody
              categoryId={categoryId}
              categoryName={currentCategory?.name ?? ''}
              needsMigration={needsMigration}
              initialEntries={entries}
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
