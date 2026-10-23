import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { ModeButton } from '@actual-app/components/mode-button';
import { Select } from '@actual-app/components/select';
import type { SelectOption } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { TransactionEntity } from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import { useDateFormat } from '#hooks/useDateFormat';
import { useLocale } from '#hooks/useLocale';

import { disabledList } from './disabledList';
import { getIntervalFormat, ReportOptions } from './ReportOptions';
import type { dateRangeProps } from './ReportOptions';
import { validateEnd, validateStart } from './reportRanges';

type ReportDateFilterProps = {
  title: ReactNode;
  interval: string;
  dateRange: string;
  isDateStatic: boolean;
  startDate: string;
  endDate: string;
  includeCurrentInterval: boolean;
  dateRangeLine: number;
  allIntervals: { name: string; pretty: string }[];
  earliestTransaction: TransactionEntity['date'];
  latestTransaction: TransactionEntity['date'];
  firstDayOfWeekIdx: SyncedPrefs['firstDayOfWeekIdx'];
  onSelectRange: (dateRange: string) => void;
  onChangeDates: (startDate: string, endDate: string) => void;
  onChangeStatic: (isDateStatic: boolean) => void;
  children?: ReactNode;
};

export function ReportDateFilter({
  title,
  interval,
  dateRange,
  isDateStatic,
  startDate,
  endDate,
  includeCurrentInterval,
  dateRangeLine,
  allIntervals,
  earliestTransaction,
  latestTransaction,
  firstDayOfWeekIdx,
  onSelectRange,
  onChangeDates,
  onChangeStatic,
  children,
}: ReportDateFilterProps) {
  const locale = useLocale();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const rangeOptions = useMemo(() => {
    const options: SelectOption[] = ReportOptions.dateRange
      .filter(f => f[interval as keyof dateRangeProps])
      .map(option => [option.key, option.description]);

    // Append separator if necessary
    if (dateRangeLine > 0) {
      options.splice(dateRangeLine, 0, Menu.line);
    }
    return options;
  }, [interval, dateRangeLine]);

  const intervalOptions = allIntervals.map(({ name, pretty }) => [
    name,
    pretty,
  ]) satisfies SelectOption[];

  return (
    <>
      <SpaceBetween
        gap={5}
        style={{
          marginTop: 10,
          marginBottom: 5,
        }}
      >
        <Text>
          <strong>{title}</strong>
        </Text>
        <View style={{ flex: 1 }} />
        <ModeButton
          selected={!isDateStatic}
          onSelect={() => onChangeStatic(false)}
        >
          <Trans>Live</Trans>
        </ModeButton>
        <ModeButton
          selected={isDateStatic}
          onSelect={() => onChangeStatic(true)}
        >
          <Trans>Static</Trans>
        </ModeButton>
      </SpaceBetween>
      {!isDateStatic ? (
        <View
          style={{
            flexDirection: 'row',
            padding: 5,
            alignItems: 'center',
          }}
        >
          <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
            <Trans>Range:</Trans>
          </Text>
          <Select
            value={dateRange}
            onChange={onSelectRange}
            options={rangeOptions}
          />
          {!disabledList.currentInterval.get(dateRange) &&
            includeCurrentInterval && (
              <Tooltip
                placement="bottom start"
                content={
                  <Text>
                    <Trans>Current month</Trans>
                  </Text>
                }
                style={{
                  ...styles.tooltip,
                  lineHeight: 1.5,
                  padding: '6px 10px',
                  marginTop: 5,
                }}
              >
                <Text style={{ marginLeft: 10 }}>+1</Text>
              </Tooltip>
            )}
        </View>
      ) : (
        <>
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              <Trans>From:</Trans>
            </Text>
            <Select
              onChange={newValue => {
                const [start, end] = validateStart(
                  earliestTransaction,
                  latestTransaction,
                  newValue,
                  endDate,
                  interval,
                  firstDayOfWeekIdx,
                );
                onChangeDates(start, end);
              }}
              value={startDate}
              defaultLabel={monthUtils.format(
                startDate,
                getIntervalFormat(interval, dateFormat),
                locale,
              )}
              options={intervalOptions}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              padding: 5,
              alignItems: 'center',
            }}
          >
            <Text style={{ width: 50, textAlign: 'right', marginRight: 5 }}>
              <Trans>To:</Trans>
            </Text>
            <Select
              onChange={newValue => {
                const [start, end] = validateEnd(
                  earliestTransaction,
                  latestTransaction,
                  startDate,
                  newValue,
                  interval,
                  firstDayOfWeekIdx,
                );
                onChangeDates(start, end);
              }}
              value={endDate}
              defaultLabel={monthUtils.format(
                endDate,
                getIntervalFormat(interval, dateFormat),
                locale,
              )}
              options={intervalOptions}
            />
          </View>
        </>
      )}
      {children}
    </>
  );
}
