import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  type SummaryContent,
  type SummaryWidget,
} from 'loot-core/types/models';

import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { View } from '../../common/View';
import { DateRange } from '../DateRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { ReportCardName } from '../ReportCardName';
import { calculateTimeRange } from '../reportRanges';
import { summarySpreadsheet } from '../spreadsheets/summary-spreadsheet';
import { SummaryNumber } from '../SummaryNumber';
import { useReport } from '../useReport';

type SummaryProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SummaryWidget['meta'];
  onMetaChange: (newMeta: SummaryWidget['meta']) => void;
  onRemove: () => void;
};

export function SummaryCard({
  widgetId,
  isEditing,
  meta = {},
  onMetaChange,
  onRemove,
}: SummaryProps) {
  const { t } = useTranslation();
  const isDashboardsFeatureEnabled = useFeatureFlag('dashboards');
  const [start, end] = calculateTimeRange(meta?.timeFrame, {
    start: monthUtils.dayFromDate(monthUtils.currentMonth()),
    end: monthUtils.currentDay(),
    mode: 'full',
  });

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
      ),
    [start, end, meta?.conditions, meta?.conditionsOp, content],
  );

  const data = useReport('summary', params);

  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  return (
    <ReportCard
      isEditing={isEditing}
      to={
        isDashboardsFeatureEnabled
          ? `/reports/summary/${widgetId}`
          : '/reports/summary'
      }
      menuItems={[
        {
          name: 'rename',
          text: t('Rename'),
        },
        {
          name: 'remove',
          text: t('Remove'),
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'rename':
            setNameMenuOpen(true);
            break;
          case 'remove':
            onRemove();
            break;
          default:
            console.warn(`Unrecognized menu selection: ${item}`);
            break;
        }
      }}
    >
      <View style={{ flex: 1, margin: 2, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', padding: 20, paddingBottom: 0 }}>
          <View style={{ flex: 1, marginBottom: -5 }}>
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
        </View>
        <View
          style={{
            width: '100%',
            flexGrow: 1,
            marginTop: -20,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {data ? (
            <SummaryNumber
              value={data?.total ?? 0}
              suffix={content.type === 'percentage' ? '%' : ''}
              loading={!data}
              initialFontSize={content.fontSize}
              fontSizeChanged={newSize => {
                const newContent = { ...content, fontSize: newSize };
                onMetaChange({
                  ...meta,
                  content: JSON.stringify(newContent),
                });
              }}
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
