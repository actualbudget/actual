import { AccountEntity, SankeyWidget } from 'loot-core/types/models';
import { ReportCard } from '../ReportCard';
import { View } from '../../common/View';
import { ReportCardName } from '../ReportCardName';
import { DateRange } from '../DateRange';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateTimeRange } from '../reportRanges';
import { LoadingIndicator } from '../LoadingIndicator';
import { useResponsive } from '../../responsive/ResponsiveProvider';
import { useReport } from '../useReport';
import { createSpreadsheet as sankeySpreadsheet } from '../spreadsheets/sankey-spreadsheet';
import { SankeyGraph } from '../graphs/SankeyGraph';

type SankeyCardProps = {
  widgetId: string;
  isEditing?: boolean;
  accounts: AccountEntity[];
  meta?: SankeyWidget['meta'];
  onMetaChange: (newMeta: SankeyWidget['meta']) => void;
  onRemove: () => void;
};

export function SankeyCard({
  widgetId,
  isEditing,
  accounts,
  meta = {},
  onMetaChange,
  onRemove,
}: SankeyCardProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [start, end] = calculateTimeRange(meta?.timeFrame);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true), []);
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false), []);

  const params = useMemo(
    () =>
      sankeySpreadsheet(
        start,
        end,
        accounts,
        meta?.conditions,
        meta?.conditionsOp,
      ),
    [start, end, accounts, meta?.conditions, meta?.conditionsOp],
  );

  const data = useReport('Sankey', params);

  return (
    <ReportCard
      isEditing={isEditing}
      to={`/reports/Sankey/${widgetId}`}
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
            throw new Error(`Unrecognized selection ${item}`);
        }
      }}
    >
      <View
        style={{ flex: 1 }}
        onPointerEnter={onCardHover}
        onPointerLeave={onCardHoverEnd}
      >
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
            graphData={data.graphData}
            compact={true}
            showTooltip={!isEditing && !isNarrowWidth}
            style={{ height: 'auto', flex: 1 }}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
