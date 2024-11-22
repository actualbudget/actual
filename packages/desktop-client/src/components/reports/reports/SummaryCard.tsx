import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import * as monthUtils from 'loot-core/src/shared/months';
import {
  type SummaryContent,
  type SummaryWidget,
} from 'loot-core/types/models';

import { View } from '../../common/View';
import { DateRange } from '../DateRange';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { ReportCardName } from '../ReportCardName';
import { calculateTimeRange } from '../reportRanges';
import { summarySpreadsheet } from '../spreadsheets/summary-spreadsheet';
import { SummaryNumber } from '../SummaryNumber';
import { useReport } from '../useReport';

type SummaryCardProps = {
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
}: SummaryCardProps) {
  const { t } = useTranslation();
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
