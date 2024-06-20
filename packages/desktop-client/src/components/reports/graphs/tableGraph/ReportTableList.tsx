import React, { type ReactNode } from 'react';

import {
  type GroupedEntity,
  type DataEntity,
} from 'loot-core/src/types/models/reports';

import { type CSSProperties, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Row } from '../../../table';

import { RenderTableRow } from './RenderTableRow';
import { type renderRowProps } from './ReportTable';

type ReportTableListProps = {
  data: DataEntity;
  mode: string;
  groupBy: string;
  renderRow: (arg: renderRowProps) => ReactNode;
  style?: CSSProperties;
};

export function ReportTableList({
  data,
  mode,
  groupBy,
  renderRow,
  style,
}: ReportTableListProps) {
  const metadata: GroupedEntity[] | undefined =
    groupBy === 'Category'
      ? data.groupedData || []
      : groupBy === 'Interval'
        ? data.intervalData.map(interval => {
            return {
              id: '',
              name: '',
              date: interval.date,
              totalAssets: interval.totalAssets,
              totalDebts: interval.totalDebts,
              totalTotals: interval.totalTotals,
              intervalData: [],
              categories: [],
            };
          })
        : data.data;

  return (
    <View>
      {metadata ? (
        <View>
          {metadata.map((item, index) => {
            return (
              <View key={index}>
                <RenderTableRow
                  index={index}
                  renderRow={renderRow}
                  mode={mode}
                  metadata={metadata}
                  style={{
                    ...(item.categories && {
                      color: theme.tableRowHeaderText,
                      backgroundColor: theme.tableRowHeaderBackground,
                      fontWeight: 600,
                    }),
                    ...style,
                  }}
                />
                {item.categories && (
                  <>
                    <View>
                      {item.categories.map(
                        (category: GroupedEntity, i: number) => {
                          return (
                            <RenderTableRow
                              key={category.id}
                              index={i}
                              renderRow={renderRow}
                              mode={mode}
                              metadata={metadata}
                              parent_index={index}
                              style={style}
                            />
                          );
                        },
                      )}
                    </View>
                    <Row height={20} />
                  </>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View width="flex" />
      )}
    </View>
  );
}
