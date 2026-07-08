import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { SankeyWidget } from '@actual-app/core/types/models';
import type { JSONValue } from '@actual-app/core/types/report-spreadsheet';
import * as d from 'date-fns';
import { debounce } from 'es-toolkit/compat';

import { SankeyGraph } from '#components/reports/graphs/SankeyGraph';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { ReportCard } from '#components/reports/ReportCard';
import { ReportCardName } from '#components/reports/ReportCardName';
import { calculateTimeRange } from '#components/reports/reportRanges';
import {
  getDefaultLayerRange,
  topNNodes,
} from '#components/reports/reports/Sankey';
import {
  buildSankeyData,
  isGraphLayer,
} from '#components/reports/spreadsheets/sankey-spreadsheet';
import type {
  Graph,
  GraphLayers,
  NodeData,
} from '#components/reports/spreadsheets/sankey-spreadsheet';
import { useCategories } from '#hooks/useCategories';
import { useLocale } from '#hooks/useLocale';
import { useResizeObserver } from '#hooks/useResizeObserver';

type SankeyCardProps = {
  widgetId: string;
  isEditing?: boolean;
  meta?: SankeyWidget['meta'];
  reportData?: JSONValue;
  onMetaChange: (newMeta: SankeyWidget['meta']) => void;
};

type SerializedSankeyGraph = Array<
  [
    string,
    Omit<NodeData, 'to'> & {
      to: Array<[string, number]>;
    },
  ]
>;

function deserializeSankeyGraph(value: JSONValue | undefined): Graph | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const graph = value.graph;
  if (!Array.isArray(graph)) {
    return null;
  }

  const result: Graph = new Map();
  for (const entry of graph as SerializedSankeyGraph) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') {
      return null;
    }

    const [, node] = entry;
    if (!node || !Array.isArray(node.to)) {
      return null;
    }

    result.set(entry[0], {
      ...node,
      to: new Map(node.to),
    });
  }

  return result;
}

export function SankeyCard({
  widgetId,
  isEditing,
  meta,
  reportData,
  onMetaChange,
}: SankeyCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const { data: { grouped: groupedCategories = [] } = { grouped: [] } } =
    useCategories();

  const [start, end] = calculateTimeRange(meta?.timeFrame);
  const mode = meta?.mode ?? 'spent';

  const [cardHeight, setCardHeight] = useState(0);
  const throttledSetCardHeight = useMemo(
    () =>
      debounce(
        (height: number) => {
          setCardHeight(prev => (prev === height ? prev : height));
        },
        200,
        { leading: true, trailing: true, maxWait: 100 },
      ),
    [],
  );

  useEffect(() => {
    return () => {
      throttledSetCardHeight.cancel();
    };
  }, [throttledSetCardHeight]);

  const containerRef = useResizeObserver<HTMLDivElement>(rect => {
    throttledSetCardHeight(rect.height);
  });

  const heightBasedTopN = topNNodes(cardHeight);
  const configuredTopN = meta?.topNcategories ?? 15;
  const topN = Math.min(configuredTopN, heightBasedTopN);

  const defaultLayerRange = getDefaultLayerRange(mode);
  let layerFrom: GraphLayers;
  let layerTo: GraphLayers;
  if (isGraphLayer(meta?.layerFrom) && isGraphLayer(meta?.layerTo)) {
    layerFrom = meta.layerFrom as GraphLayers;
    layerTo = meta.layerTo as GraphLayers;
  } else {
    layerFrom = defaultLayerRange.from;
    layerTo = defaultLayerRange.to;
  }

  const displayBaseGraph = useMemo(
    () => deserializeSankeyGraph(reportData),
    [reportData],
  );
  const compactData = useMemo(() => {
    if (!displayBaseGraph) {
      return null;
    }

    return buildSankeyData(
      displayBaseGraph,
      topN,
      groupedCategories,
      meta?.categorySort ?? 'per-group',
      layerFrom,
      layerTo,
    );
  }, [
    displayBaseGraph,
    topN,
    groupedCategories,
    meta?.categorySort,
    layerFrom,
    layerTo,
  ]);

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
      widgetId={widgetId}
      isEditing={isEditing}
      disableClick={nameMenuOpen}
      to={`/reports/sankey/${widgetId}`}
      onRename={() => setNameMenuOpen(true)}
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
            <Block style={{ color: theme.pageTextSubdued }}>
              {dateDescription}
            </Block>
          </View>
        </View>

        {compactData ? (
          <View ref={containerRef} style={{ flexGrow: 1 }}>
            <SankeyGraph
              data={compactData}
              showPercentages={meta?.showPercentages}
              showTooltip={!isEditing}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
