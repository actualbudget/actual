import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { SankeyWidget } from '@actual-app/core/types/models';
import * as d from 'date-fns';

import { SankeyGraph } from '#components/reports/graphs/SankeyGraph';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateTimeRange } from '#components/reports/reportRanges';
import {
  compactSankeyData,
  createSpreadsheet as sankeySpreadsheet,
} from '#components/reports/spreadsheets/sankey-spreadsheet';
import { useDashboardWidgetCopyMenu } from '#components/reports/useDashboardWidgetCopyMenu';
import { useReport } from '#components/reports/useReport';
import { useCategories } from '#hooks/useCategories';
import { useLocale } from '#hooks/useLocale';
import { useResizeObserver } from '#hooks/useResizeObserver';

type SankeyCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SankeyWidget['meta'];
  onMetaChange: (newMeta: SankeyWidget['meta']) => void;
  onRemove: () => void;
  onCopy: (targetDashboardId: string) => void;
};
export function SankeyCard({
  widgetId,
  isEditing,
  meta,
  onMetaChange,
  onRemove,
  onCopy,
}: SankeyCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { menuItems: copyMenuItems, handleMenuSelect: handleCopyMenuSelect } =
    useDashboardWidgetCopyMenu(onCopy);
  const { data: { grouped: groupedCategories = [] } = { grouped: [] } } =
    useCategories();

  const [start, end] = calculateTimeRange(meta?.timeFrame);
  const mode = meta?.mode ?? 'spent';

  const [cardHeight, setCardHeight] = useState(0);
  const containerRef = useResizeObserver<HTMLDivElement>(rect => {
    setCardHeight(rect.height);
  });

  const params = useMemo(
    () =>
      sankeySpreadsheet(
        start,
        end,
        groupedCategories,
        meta?.conditions ?? [],
        meta?.conditionsOp ?? 'and',
        mode,
      ),
    [start, end, groupedCategories, meta?.conditions, meta?.conditionsOp, mode],
  );
  const data = useReport('sankey', params);

  const HEADER_HEIGHT = 82;
  const PX_PER_NODE = 50;
  const topN = Math.max(
    2,
    Math.floor((cardHeight - HEADER_HEIGHT) / PX_PER_NODE),
  );

  const compactData = useMemo(
    () => (data ? compactSankeyData(data, topN) : null),
    [data, topN],
  );

  const startDate = d.parseISO(start);
  const endDate = d.parseISO(end);
  const formattedStartDate = d.format(startDate, 'MMM yyyy', { locale });
  const formattedEndDate = d.format(endDate, 'MMM yyyy', { locale });

  let dateDescription: string | ReactElement;
  if (
    startDate.getFullYear() !== endDate.getFullYear() ||
    startDate.getMonth() !== endDate.getMonth()
  ) {
    dateDescription = formattedStartDate + ' - ' + formattedEndDate;
  } else {
    dateDescription = formattedEndDate;
  }

  const modeLabel = mode === 'budgeted' ? t('Budgeted') : t('Spent');

  dateDescription += ` (${modeLabel})`;

  return (
    <ReportCard
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/sankey/${widgetId}`}
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
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View ref={containerRef} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <ReportCardName
              name={meta?.name || t('Sankey')}
              isEditing={nameMenuOpen}
              onChange={newName => {
                onMetaChange({
                  ...meta,
                  name: newName,
                });
                setNameMenuOpen(false);
              }}
              onClose={() => setNameMenuOpen(false)}
            />
            <Block style={{ color: theme.pageTextSubdued }}>
              {dateDescription}
            </Block>
          </View>
        </View>

        {compactData ? (
          <SankeyGraph
            data={compactData}
            showTooltip={!isEditing}
            style={{ height: 'auto', flex: 1 }}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
