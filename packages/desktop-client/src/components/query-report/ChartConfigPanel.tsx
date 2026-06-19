import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type {
  ChannelDef,
  ChartSpec,
  ConditionalRule,
  Encoding,
  Mark,
} from 'loot-core/types/chart-spec';

import { ConditionalRuleEditor } from './ConditionalRuleEditor';

import { LabeledCheckbox } from '@desktop-client/components/forms/LabeledCheckbox';
import type { QueryResult } from '@desktop-client/queries/processQueryResult';
import type {
  ResolvedChannel,
  ResolvedChartSpec,
} from '@desktop-client/queries/resolveChannels';

type ChartConfigPanelProps = {
  result: QueryResult | null;
  chartSpec: ChartSpec;
  resolved: ResolvedChartSpec | null;
  onChartSpecChange: (next: ChartSpec) => void;
};

type Section = 'conditional' | 'axes' | 'fields' | 'numberDisplay';

const CHART_MARKS: Mark[] = ['column', 'bar', 'line', 'area', 'point'];
const CONDITIONAL_MARKS: Mark[] = ['table', 'number'];
const NUMBER_MARKS: Mark[] = ['number'];

function sectionVisibility(mark: Mark): {
  conditional: boolean;
  axes: boolean;
  fields: boolean;
  numberDisplay: boolean;
} {
  return {
    conditional: CONDITIONAL_MARKS.includes(mark),
    axes: CHART_MARKS.includes(mark),
    fields: true,
    numberDisplay: NUMBER_MARKS.includes(mark),
  };
}

type ChannelKey = 'x' | 'y' | 'series' | 'size';
type ChannelEntry = {
  key: ChannelKey;
  channel: ChannelDef;
  isArray: boolean;
  index?: number;
  autoAssigned?: boolean;
};

function resolvedToChannelDef(ch: ResolvedChannel): ChannelDef {
  const def: ChannelDef = { field: ch.field };
  if (ch.type !== undefined) def.type = ch.type;
  if (ch.title !== undefined) def.title = ch.title;
  if (ch.format !== undefined) def.format = ch.format;
  if (ch.sort !== undefined) def.sort = ch.sort;
  if (ch.aggregate !== undefined) def.aggregate = ch.aggregate;
  return def;
}

function getAllChannels(
  encoding: Encoding,
  resolved: ResolvedChartSpec | null,
): ChannelEntry[] {
  const result: ChannelEntry[] = [];
  const seen = new Set<string>();

  for (const key of ['x', 'y', 'series', 'size'] as const) {
    const ch = encoding[key];
    if (!ch) continue;
    if (Array.isArray(ch)) {
      ch.forEach((c, i) => {
        result.push({ key, channel: c, isArray: true, index: i });
        seen.add(`${key}:${c.field}`);
      });
    } else {
      result.push({ key, channel: ch, isArray: false });
      seen.add(`${key}:${ch.field}`);
    }
  }

  if (resolved) {
    const resolvedEncoding = resolved.encoding;
    for (const key of ['x', 'y', 'series', 'size'] as const) {
      const ch = resolvedEncoding[key];
      if (!ch) continue;
      if (Array.isArray(ch)) {
        ch.forEach((c, i) => {
          if (!seen.has(`${key}:${c.field}`)) {
            result.push({
              key,
              channel: resolvedToChannelDef(c),
              isArray: true,
              index: i,
              autoAssigned: true,
            });
            seen.add(`${key}:${c.field}`);
          }
        });
      } else if (!seen.has(`${key}:${ch.field}`)) {
        result.push({
          key,
          channel: resolvedToChannelDef(ch),
          isArray: false,
          autoAssigned: true,
        });
        seen.add(`${key}:${ch.field}`);
      }
    }
  }

  return result;
}

const NUMERIC_FORMAT_OPTIONS: Array<readonly [string, string]> = [
  ['default', 'Default'],
  ['financial', 'Financial'],
  ['financial-no-decimals', 'Financial (no decimals)'],
  ['number', 'Number'],
  ['percent', 'Percent'],
];

const DATE_FORMAT_OPTIONS: Array<readonly [string, string]> = [
  ['default', 'Default'],
  ['date', 'Date (MM/DD/YYYY)'],
  ['date-month', 'Month year (MMM YYYY)'],
  ['date-year', 'Year'],
];

function formatOptionsForType(type: string): Array<readonly [string, string]> {
  if (type === 'date' || type === 'date-month' || type === 'date-year') {
    return DATE_FORMAT_OPTIONS;
  }
  if (type === 'number' || type === 'integer' || type === 'float') {
    return NUMERIC_FORMAT_OPTIONS;
  }
  return [['default', 'Default']];
}

function updateChannel(
  chartSpec: ChartSpec,
  key: ChannelKey,
  entry: ChannelEntry,
  patch: Partial<ChannelDef>,
  onChartSpecChange: (next: ChartSpec) => void,
  resolved?: ResolvedChartSpec | null,
) {
  const encoding = chartSpec.encoding;
  const current = encoding[key];

  if (entry.autoAssigned) {
    const existing = Array.isArray(current)
      ? current.find(c => c.field === entry.channel.field)
      : current &&
          !Array.isArray(current) &&
          current.field === entry.channel.field
        ? current
        : undefined;

    if (Array.isArray(current)) {
      if (existing) {
        const nextArr = current.map(c =>
          c.field === entry.channel.field ? { ...c, ...patch } : c,
        );
        onChartSpecChange({
          ...chartSpec,
          encoding: { ...encoding, [key]: nextArr },
        });
      } else {
        onChartSpecChange({
          ...chartSpec,
          encoding: {
            ...encoding,
            [key]: [...current, { ...entry.channel, ...patch }],
          },
        });
      }
    } else if (existing) {
      onChartSpecChange({
        ...chartSpec,
        encoding: { ...encoding, [key]: { ...existing, ...patch } },
      });
    } else {
      const siblingDefs: ChannelDef[] = [];
      if (resolved) {
        const resolvedCh = resolved.encoding[key];
        if (resolvedCh) {
          const resolvedArr = Array.isArray(resolvedCh)
            ? resolvedCh
            : [resolvedCh];
          for (const ch of resolvedArr) {
            if (ch.autoAssigned && ch.field !== entry.channel.field) {
              siblingDefs.push(resolvedToChannelDef(ch));
            }
          }
        }
      }
      const allDefs = [{ ...entry.channel, ...patch }, ...siblingDefs];
      onChartSpecChange({
        ...chartSpec,
        encoding: {
          ...encoding,
          [key]: allDefs.length === 1 ? allDefs[0] : allDefs,
        },
      });
    }
    return;
  }

  if (entry.isArray && Array.isArray(current) && entry.index !== undefined) {
    const nextArr = current.map((c, i) =>
      i === entry.index ? { ...c, ...patch } : c,
    );
    onChartSpecChange({
      ...chartSpec,
      encoding: { ...encoding, [key]: nextArr },
    });
  } else if (!entry.isArray && current && !Array.isArray(current)) {
    onChartSpecChange({
      ...chartSpec,
      encoding: { ...encoding, [key]: { ...current, ...patch } },
    });
  }
}

export function ChartConfigPanel({
  result,
  chartSpec,
  resolved,
  onChartSpecChange,
}: ChartConfigPanelProps) {
  const { t } = useTranslation();
  const visibility = sectionVisibility(chartSpec.mark);

  const allChannels = useMemo(
    () => getAllChannels(chartSpec.encoding, resolved),
    [chartSpec.encoding, resolved],
  );

  const rules = chartSpec.config?.conditionalRules ?? [];
  const [editingRule, setEditingRule] = useState<
    { index: number; rule: ConditionalRule } | { rule: ConditionalRule } | null
  >(null);

  const updateRules = (next: ConditionalRule[]) => {
    onChartSpecChange({
      ...chartSpec,
      config: { ...chartSpec.config, conditionalRules: next },
    });
  };

  const updateAxes = (
    patch: Partial<NonNullable<NonNullable<ChartSpec['config']>['axes']>>,
  ) => {
    const axes = chartSpec.config?.axes ?? {};
    onChartSpecChange({
      ...chartSpec,
      config: { ...chartSpec.config, axes: { ...axes, ...patch } },
    });
  };

  const valueAxis = chartSpec.config?.axes?.valueAxis ?? {};
  const categoryAxis = chartSpec.config?.axes?.categoryAxis ?? {};

  const xEnc = chartSpec.encoding.x;
  const xIsDate = xEnc && !Array.isArray(xEnc) && xEnc.type === 'date';

  if (!visibility.conditional && !visibility.axes && !visibility.fields) {
    return (
      <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        <Trans>No customization available for this mark.</Trans>
      </div>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {visibility.conditional && (
        <Section title={t('Conditional formatting')}>
          {rules.length === 0 && !editingRule && (
            <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
              <Trans>No rules configured.</Trans>
            </div>
          )}
          {rules.map((rule, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 8,
                border: `1px solid ${theme.tableBorder}`,
                borderRadius: 4,
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12 }}>{summarizeRule(rule)}</div>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Button onPress={() => setEditingRule({ index: i, rule })}>
                  <Trans>Edit</Trans>
                </Button>
                <Button
                  onPress={() =>
                    updateRules(rules.filter((_, idx) => idx !== i))
                  }
                >
                  <Trans>Delete</Trans>
                </Button>
              </View>
            </View>
          ))}
          {editingRule && (
            <ConditionalRuleEditor
              result={result}
              rule={editingRule.rule}
              isTable={chartSpec.mark === 'table'}
              onSave={next => {
                if ('index' in editingRule) {
                  const nextRules = [...rules];
                  nextRules[editingRule.index] = next;
                  updateRules(nextRules);
                } else {
                  updateRules([...rules, next]);
                }
                setEditingRule(null);
              }}
              onCancel={() => setEditingRule(null)}
            />
          )}
          {!editingRule && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Button
                onPress={() =>
                  setEditingRule({
                    rule: {
                      type: 'single_color',
                      field: result?.columns?.[0]?.name ?? '',
                      conditions: [{ operator: 'equals', value: '' }],
                      styling: {},
                    },
                  })
                }
              >
                <Trans>Add rule</Trans>
              </Button>
              <Button
                onPress={() =>
                  setEditingRule({
                    rule: {
                      type: 'color_scale',
                      field: '',
                      minColor: '#ffffff',
                      maxColor: '#000000',
                    },
                  })
                }
              >
                <Trans>Color scale</Trans>
              </Button>
            </View>
          )}
        </Section>
      )}

      {visibility.axes && (
        <Section title={t('Axes')}>
          <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>
            <Trans>Value axis</Trans>
          </div>
          <LabeledCheckbox
            id="chart-config-value-axis-show-label"
            checked={valueAxis.showLabel === true}
            onChange={() =>
              updateAxes({
                valueAxis: {
                  ...valueAxis,
                  showLabel: valueAxis.showLabel === true ? false : true,
                },
              })
            }
          >
            <Trans>Show label</Trans>
          </LabeledCheckbox>
          {valueAxis.showLabel === true && (
            <Field label={t('Override label')}>
              <Input
                value={valueAxis.labelOverride ?? ''}
                onChangeValue={v =>
                  updateAxes({
                    valueAxis: {
                      ...valueAxis,
                      ...(v
                        ? { labelOverride: v }
                        : { labelOverride: undefined }),
                    },
                  })
                }
              />
            </Field>
          )}
          <div
            style={{
              fontSize: 12,
              color: theme.pageTextSubdued,
              marginTop: 8,
            }}
          >
            <Trans>Category axis</Trans>
          </div>
          <LabeledCheckbox
            id="chart-config-category-axis-show-label"
            checked={categoryAxis.showLabel === true}
            onChange={() =>
              updateAxes({
                categoryAxis: {
                  ...categoryAxis,
                  showLabel: categoryAxis.showLabel === true ? false : true,
                },
              })
            }
          >
            <Trans>Show label</Trans>
          </LabeledCheckbox>
          {categoryAxis.showLabel === true && (
            <Field label={t('Override label')}>
              <Input
                value={categoryAxis.labelOverride ?? ''}
                onChangeValue={v =>
                  updateAxes({
                    categoryAxis: {
                      ...categoryAxis,
                      ...(v
                        ? { labelOverride: v }
                        : { labelOverride: undefined }),
                    },
                  })
                }
              />
            </Field>
          )}
          {xIsDate && (
            <LabeledCheckbox
              id="chart-config-fill-gaps"
              checked={chartSpec.config?.fillGaps !== false}
              onChange={() =>
                onChartSpecChange({
                  ...chartSpec,
                  config: {
                    ...chartSpec.config,
                    fillGaps:
                      chartSpec.config?.fillGaps === false ? undefined : false,
                  },
                })
              }
            >
              <Trans>Fill date gaps</Trans>
            </LabeledCheckbox>
          )}
        </Section>
      )}
      {visibility.numberDisplay && (
        <Section title={t('Number display')}>
          <LabeledCheckbox
            id="chart-config-number-static-font"
            checked={chartSpec.config?.fontSizeMode === 'static'}
            onChange={() =>
              onChartSpecChange({
                ...chartSpec,
                config: {
                  ...chartSpec.config,
                  fontSizeMode:
                    chartSpec.config?.fontSizeMode === 'static'
                      ? 'dynamic'
                      : 'static',
                },
              })
            }
          >
            <Trans>Static font size</Trans>
          </LabeledCheckbox>
          {chartSpec.config?.fontSizeMode === 'static' && (
            <Field label={t('Font size')}>
              <Input
                type="number"
                value={
                  chartSpec.config?.staticFontSize !== undefined
                    ? String(chartSpec.config.staticFontSize)
                    : '32'
                }
                onChangeValue={v => {
                  const num = parseInt(v, 10);
                  onChartSpecChange({
                    ...chartSpec,
                    config: {
                      ...chartSpec.config,
                      staticFontSize: Number.isNaN(num) ? undefined : num,
                    },
                  });
                }}
              />
            </Field>
          )}
        </Section>
      )}
      {chartSpec.mark === 'table' && (
        <Section title={t('Table options')}>
          <LabeledCheckbox
            id="chart-config-show-group-divider"
            checked={chartSpec.config?.showGroupDivider !== false}
            onChange={() =>
              onChartSpecChange({
                ...chartSpec,
                config: {
                  ...chartSpec.config,
                  showGroupDivider:
                    chartSpec.config?.showGroupDivider === false ? true : false,
                },
              })
            }
          >
            <Trans>Show group divider</Trans>
          </LabeledCheckbox>
        </Section>
      )}

      {visibility.fields && allChannels.length > 0 && (
        <Section title={t('Fields')}>
          {allChannels.map((entry, i) => {
            const col = result?.columns?.find(
              c => c.name === entry.channel.field,
            );
            const colType = col?.type ?? 'string';
            const fmtOpts = formatOptionsForType(colType);
            const currentFormat = entry.channel.format ?? 'default';
            return (
              <View
                key={`${entry.key}-${entry.channel.field}-${i}`}
                style={{
                  padding: 8,
                  border: `1px solid ${theme.tableBorder}`,
                  borderRadius: 4,
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: theme.pageTextSubdued,
                    fontWeight: 600,
                  }}
                >
                  {entry.key.toUpperCase()}: {entry.channel.field}
                  {entry.autoAssigned && (
                    <span
                      style={{
                        fontSize: 11,
                        color: theme.pageTextSubdued,
                        marginLeft: 4,
                        fontWeight: 400,
                      }}
                    >
                      (auto)
                    </span>
                  )}
                </div>
                <Field label={t('Label')}>
                  <Input
                    value={entry.channel.title ?? entry.channel.field}
                    onChangeValue={v =>
                      updateChannel(
                        chartSpec,
                        entry.key,
                        entry,
                        { title: v === entry.channel.field ? undefined : v },
                        onChartSpecChange,
                        resolved,
                      )
                    }
                  />
                </Field>
                <Field label={t('Format')}>
                  <Select
                    value={currentFormat}
                    options={fmtOpts}
                    onChange={v =>
                      updateChannel(
                        chartSpec,
                        entry.key,
                        entry,
                        v === 'default' ? { format: undefined } : { format: v },
                        onChartSpecChange,
                        resolved,
                      )
                    }
                  />
                </Field>
              </View>
            );
          })}
        </Section>
      )}
    </View>
  );
}

function summarizeRule(rule: ConditionalRule): string {
  if (rule.type === 'color_scale') {
    return `Color scale on ${rule.field}: ${rule.minColor} → ${rule.maxColor}`;
  }
  const condStr = rule.conditions
    .map(c => `${c.operator} ${c.value ?? ''}`)
    .join(', ');
  return `If ${rule.field} ${condStr}`;
}

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View>
      <div
        style={{
          fontSize: 12,
          color: theme.pageTextSubdued,
          fontWeight: 600,
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <View>
      <div
        style={{
          fontSize: 11,
          color: theme.pageTextSubdued,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      {children}
    </View>
  );
}
