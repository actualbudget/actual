import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type SankeyWidget } from 'loot-core/types/models';

import { useCategories } from '../../../hooks/useCategories';
import { View } from '../../common/View';
import { DateRange } from '../DateRange';
import { SankeyGraph } from '../graphs/SankeyGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { ReportCardName } from '../ReportCardName';
import { calculateTimeRange } from '../reportRanges';
import { createSpreadsheet as sankeySpreadsheet } from '../spreadsheets/sankey-spreadsheet';
import { useReport } from '../useReport';

type SankeyCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SankeyWidget['meta'];
  onMetaChange: (newMeta: SankeyWidget['meta']) => void;
  onRemove: () => void;
};
export function SankeyCard({
  widgetId,
  isEditing,
  meta,
  onMetaChange,
  onRemove,
}: SankeyCardProps) {
  const { t } = useTranslation();
  const { grouped: categoryGroups } = useCategories();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);

  const [start, end] = calculateTimeRange(meta?.timeFrame);

  const params = useMemo(
    () =>
      sankeySpreadsheet(
        start,
        end,
        categoryGroups,
        meta?.conditions,
        meta?.conditionsOp,
      ),
    [start, end, categoryGroups, meta?.conditions, meta?.conditionsOp],
  );
  const data = useReport('sankey', params);

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
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View style={{ flex: 1 }}>
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
            <DateRange start={start} end={end} />
          </View>
        </View>

        {data ? (
          <SankeyGraph
            data={data}
            compact
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
