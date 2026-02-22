import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import type { SummaryContent, SummaryWidget } from 'loot-core/types/models';

import { DateRange } from '@desktop-client/components/reports/DateRange';
import { LoadingIndicator } from '@desktop-client/components/reports/LoadingIndicator';
import { ReportCard } from '@desktop-client/components/reports/ReportCard';
import { ReportCardName } from '@desktop-client/components/reports/ReportCardName';
import { calculateTimeRange } from '@desktop-client/components/reports/reportRanges';
import { summarySpreadsheet } from '@desktop-client/components/reports/spreadsheets/summary-spreadsheet';
import { SummaryNumber } from '@desktop-client/components/reports/SummaryNumber';
import { useDashboardWidgetCopyMenu } from '@desktop-client/components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '@desktop-client/components/reports/useReport';
import { useLocale } from '@desktop-client/hooks/useLocale';

type SummaryCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SummaryWidget['meta'];
  onMetaChange: (newMeta: SummaryWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};

export function SummaryCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
  onCopy,
}: SummaryCardProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const [latestTransaction, setLatestTransaction] = useState<string>('');
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);

  useEffect(() => {
    async function fetchLatestTransaction() {
      const latestTrans = await send('get-latest-transaction');
      setLatestTransaction(
        latestTrans ? latestTrans.date : monthUtils.currentDay(),
      );
    }
    void fetchLatestTransaction();
  }, []);

  const [start, end] = calculateTimeRange(
    meta?.timeFrame,
    {
      start: monthUtils.dayFromDate(monthUtils.currentMonth()),
      end: monthUtils.currentDay(),
      mode: 'full',
    },
    latestTransaction,
  );

  const content = useMemo(
    () =>
      (meta?.content
        ? (() => {
            try {
              return JSON.parse(meta.content);
            } catch (error) {
              console.error('Failed to parse meta.content:', error);
              return { type: 'sum' };
            }
          })()
        : { type: 'sum' }) as SummaryContent,
    [meta],
  );

  const params = useMemo(
    () =>
      summarySpreadsheet(
        start,
        end,
        meta?.conditions,
        meta?.conditionsOp,
        content,
        locale,
      ),
    [start, end, meta?.conditions, meta?.conditionsOp, content, locale],
  );

  const data = useReport('summary', params);

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/summary/${widgetId}`}
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
        ...copyMenuItems,
      ]}
      onMenuSelect={item => {
        if (handleCopyMenuSelect(item)) return;
        switch (item) {
          case 'rename':
            setNameMenuOpen(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized menu selection: ${item}`);
        }
      }}
    >
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View style={{ flexGrow: 0, flexShrink: 0, padding: 20 }}>
          <ReportCardName
            name={meta?.name || t('Summary')}
            isEditing={nameMenuOpen}
            onChange={newName => {
              onMetaChange({
                ...meta,
                content: JSON.stringify(content),
                name: newName,
              });
              setNameMenuOpen(false);
            }}
            onClose={() => setNameMenuOpen(false)}
          />
          <DateRange start={start} end={end} />
        </View>
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
            flexShrink: 1,
          }}
        >
          {data ? (
            <SummaryNumber
              value={data?.total ?? 0}
              contentType={content.type}
              suffix={content.type === 'percentage' ? '%' : ''}
              loading={!data}
              initialFontSize={content.fontSize}
              animate={isEditing ?? false}
            />
          ) : (
            <LoadingIndicator />
          )}
        </View>
      </View>
    </ReportCard>
  );
}
