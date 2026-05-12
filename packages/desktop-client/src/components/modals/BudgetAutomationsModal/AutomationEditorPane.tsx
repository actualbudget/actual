import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryGroupEntity,
  ScheduleEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { ActiveEditor } from '#components/budget/goals/ActiveEditor';
import type { AutomationEntry } from '#components/budget/goals/automationExamples';
import {
  AutomationErrorDetail,
  AutomationErrorTitle,
} from '#components/budget/goals/automationMessages';
import type { DisplayTemplateType } from '#components/budget/goals/constants';
import { getDisplayTemplateMeta } from '#components/budget/goals/displayTemplateMeta';
import {
  getInitialState,
  templateReducer,
} from '#components/budget/goals/reducer';
import type { AutomationErrorKind } from '#components/budget/goals/validateAutomation';

import { NON_CONTRIBUTION_TYPES, TypePicker } from './TypePicker';

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

export function AutomationEditorPane({
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

      {!NON_CONTRIBUTION_TYPES.has(state.displayType) && (
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
            <Trans>Automation type</Trans>
          </Text>
          <TypePicker
            active={state.displayType}
            disabledTypes={disabledTypes}
            onPick={type => dispatch({ type: 'set-type', payload: type })}
          />
        </>
      )}

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
            {NON_CONTRIBUTION_TYPES.has(state.displayType) && (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.pageTextSubdued,
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {getDisplayTemplateMeta(state.displayType).description}
              </Text>
            )}
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
