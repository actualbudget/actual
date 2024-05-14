import React, {
  type UIEventHandler,
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react';

import {
  amountToCurrency,
  amountToInteger,
  integerToCurrency,
} from 'loot-core/src/shared/util';
import { type DataEntity } from 'loot-core/src/types/models/reports';
import { type RuleConditionEntity } from 'loot-core/types/models/rule';

import { useAccounts } from '../../../../hooks/useAccounts';
import { useCategories } from '../../../../hooks/useCategories';
import { useNavigate } from '../../../../hooks/useNavigate';
import { useResponsive } from '../../../../ResponsiveProvider';
import { theme } from '../../../../style';
import { styles } from '../../../../style/styles';
import { type CSSProperties } from '../../../../style/types';
import { View } from '../../../common/View';
import { Row, Cell } from '../../../table';
import { showActivity } from '../showActivity';

type ReportTableTotalsProps = {
  data: DataEntity;
  balanceTypeOp: 'totalAssets' | 'totalDebts' | 'totalTotals';
  mode: string;
  intervalsCount: number;
  totalScrollRef: RefObject<HTMLDivElement>;
  handleScroll: UIEventHandler<HTMLDivElement>;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
  groupBy: string;
  filters?: RuleConditionEntity[];
  showHiddenCategories?: boolean;
  showOffBudget?: boolean;
};

export function ReportTableTotals({
  data,
  balanceTypeOp,
  mode,
  intervalsCount,
  totalScrollRef,
  handleScroll,
  compact,
  style,
  compactStyle,
  groupBy,
  filters = [],
  showHiddenCategories = false,
  showOffBudget = false,
}: ReportTableTotalsProps) {
  const [scrollWidthTotals, setScrollWidthTotals] = useState(0);

  useLayoutEffect(() => {
    if (totalScrollRef.current) {
      const [parent, child] = [
        totalScrollRef.current.offsetParent
          ? (totalScrollRef.current.parentElement
              ? totalScrollRef.current.parentElement.scrollHeight
              : 0) || 0
          : 0,
        totalScrollRef.current ? totalScrollRef.current.scrollHeight : 0,
      ];
      setScrollWidthTotals(parent > 0 && child > 0 ? parent - child : 0);
    }
  });
  const average = amountToInteger(data[balanceTypeOp]) / intervalsCount;

  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const categories = useCategories();
  const accounts = useAccounts();

  const pointer =
    !isNarrowWidth && !['Group', 'Interval'].includes(groupBy)
      ? 'pointer'
      : 'inherit';

  const hoverUnderline =
    !isNarrowWidth && !['Group', 'Interval'].includes(groupBy)
      ? {
          cursor: pointer,
          ':hover': { textDecoration: 'underline' },
          flexGrow: 0,
        }
      : {};

  return (
    <Row
      collapsed={true}
      height={32 + scrollWidthTotals}
      style={{
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
        justifyContent: 'center',
        color: theme.tableHeaderText,
        backgroundColor: theme.tableHeaderBackground,
        fontWeight: 600,
        ...style,
      }}
    >
      <View
        innerRef={totalScrollRef}
        onScroll={handleScroll}
        id="total"
        style={{
          overflowX: 'auto',
          scrollbarWidth: compact ? 'none' : 'inherit',
          ...styles.horizontalScrollbar,
          '::-webkit-scrollbar': {
            backgroundColor: theme.tableBackground,
            height: 12,
            dispaly: compact && 'none',
          },
          flexDirection: 'row',
          flex: 1,
        }}
      >
        <Cell
          style={{
            width: compact ? 80 : 125,
            flexShrink: 0,
          }}
          valueStyle={compactStyle}
          value="Totals"
        />
        {mode === 'time'
          ? data.intervalData.map(item => {
              return (
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  linkStyle={hoverUnderline}
                  valueStyle={compactStyle}
                  key={amountToCurrency(item[balanceTypeOp])}
                  value={amountToCurrency(item[balanceTypeOp])}
                  title={
                    Math.abs(item[balanceTypeOp]) > 100000
                      ? amountToCurrency(item[balanceTypeOp])
                      : undefined
                  }
                  onClick={() =>
                    !isNarrowWidth &&
                    !['Group', 'Interval'].includes(groupBy) &&
                    showActivity({
                      navigate,
                      categories,
                      accounts,
                      balanceTypeOp,
                      filters,
                      showHiddenCategories,
                      showOffBudget,
                      type: 'time',
                      startDate: item.dateStart || '',
                    })
                  }
                  width="flex"
                  privacyFilter
                />
              );
            })
          : balanceTypeOp === 'totalTotals' && (
              <>
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  linkStyle={hoverUnderline}
                  valueStyle={compactStyle}
                  value={amountToCurrency(data.totalAssets)}
                  title={
                    Math.abs(data.totalAssets) > 100000
                      ? amountToCurrency(data.totalAssets)
                      : undefined
                  }
                  onClick={() =>
                    !isNarrowWidth &&
                    !['Group', 'Interval'].includes(groupBy) &&
                    showActivity({
                      navigate,
                      categories,
                      accounts,
                      balanceTypeOp,
                      filters,
                      showHiddenCategories,
                      showOffBudget,
                      type: 'assets',
                      startDate: data.startDate || '',
                      endDate: data.endDate,
                    })
                  }
                  width="flex"
                  privacyFilter
                />
                <Cell
                  style={{
                    minWidth: compact ? 50 : 85,
                  }}
                  linkStyle={hoverUnderline}
                  valueStyle={compactStyle}
                  value={amountToCurrency(data.totalDebts)}
                  title={
                    Math.abs(data.totalDebts) > 100000
                      ? amountToCurrency(data.totalDebts)
                      : undefined
                  }
                  onClick={() =>
                    !isNarrowWidth &&
                    !['Group', 'Interval'].includes(groupBy) &&
                    showActivity({
                      navigate,
                      categories,
                      accounts,
                      balanceTypeOp,
                      filters,
                      showHiddenCategories,
                      showOffBudget,
                      type: 'debts',
                      startDate: data.startDate || '',
                      endDate: data.endDate,
                    })
                  }
                  width="flex"
                  privacyFilter
                />
              </>
            )}
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
          }}
          linkStyle={hoverUnderline}
          valueStyle={compactStyle}
          value={amountToCurrency(data[balanceTypeOp])}
          title={
            Math.abs(data[balanceTypeOp]) > 100000
              ? amountToCurrency(data[balanceTypeOp])
              : undefined
          }
          onClick={() =>
            !isNarrowWidth &&
            !['Group', 'Interval'].includes(groupBy) &&
            showActivity({
              navigate,
              categories,
              accounts,
              balanceTypeOp,
              filters,
              showHiddenCategories,
              showOffBudget,
              type: 'totals',
              startDate: data.startDate || '',
              endDate: data.endDate,
            })
          }
          width="flex"
          privacyFilter
        />
        <Cell
          style={{
            minWidth: compact ? 50 : 85,
          }}
          valueStyle={compactStyle}
          value={integerToCurrency(Math.round(average))}
          title={
            Math.abs(Math.round(average / 100)) > 100000
              ? integerToCurrency(Math.round(average))
              : undefined
          }
          width="flex"
          privacyFilter
        />
      </View>
    </Row>
  );
}
