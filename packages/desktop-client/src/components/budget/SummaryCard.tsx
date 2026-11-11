import type { ComponentProps, ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import {
  SvgArrowButtonDown1,
  SvgArrowButtonUp1,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { NotesButton } from '#components/NotesButton';
import { useLocale } from '#hooks/useLocale';

type SummaryCardProps = {
  month: string;
  isCurrentMonth: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  menuTriggerRef: RefObject<HTMLButtonElement | null>;
  onMenuOpen: () => void;
  /** Extra props for the menu button (e.g. hover handlers). */
  menuTriggerProps?: Partial<ComponentProps<typeof Button>>;
  /** Popover rendered next to the menu button. */
  menu: ReactNode;
  /** The headline figure (e.g. "Left to budget"). Always rendered. */
  headline: ReactNode;
  /** Breakdown rows rendered under the headline when not collapsed. */
  children?: ReactNode;
  style?: CSSProperties;
};

/**
 * The card shell shared by the envelope and tracking month summaries. It
 * gives both budget types the same visual hierarchy: a small month label, one
 * big headline number, then a detailed breakdown underneath.
 */
export function SummaryCard({
  month,
  isCurrentMonth,
  collapsed,
  onToggleCollapse,
  menuTriggerRef,
  onMenuOpen,
  menuTriggerProps,
  menu,
  headline,
  children,
  style,
}: SummaryCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const ExpandOrCollapseIcon = collapsed
    ? SvgArrowButtonDown1
    : SvgArrowButtonUp1;

  return (
    <View
      data-testid="budget-summary"
      data-month={month}
      style={{
        ...styles.card,
        backgroundColor: isCurrentMonth
          ? theme.budgetCurrentMonth
          : theme.budgetOtherMonth,
        flexShrink: 0,
        cursor: 'default',
        overflow: 'hidden',
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible, &:focus-within .hover-visible': {
          opacity: 1,
        },
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          padding: '12px 14px 0 16px',
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              ...styles.eyebrow,
              color: isCurrentMonth
                ? theme.pageTextPositive
                : theme.pageTextLight,
            }}
          >
            {isCurrentMonth
              ? t('This month')
              : month < monthUtils.currentMonth()
                ? t('Past month')
                : t('Future month')}
          </Text>
          <Text
            data-testid="budget-summary-month"
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: theme.pageText,
              ...styles.ellipsisText,
            }}
          >
            {monthUtils.format(month, 'MMMM yyyy', locale)}
          </Text>
        </View>

        <Button
          variant="bare"
          aria-label={
            collapsed ? t('Expand month summary') : t('Collapse month summary')
          }
          className="hover-visible"
          onPress={onToggleCollapse}
          style={{ padding: 4 }}
        >
          <ExpandOrCollapseIcon
            width={12}
            height={12}
            style={{ color: theme.pageTextLight }}
          />
        </Button>
        <NotesButton
          id={`budget-${month}`}
          width={14}
          height={14}
          tooltipPosition="bottom right"
          defaultColor={theme.pageTextLight}
        />
        <View style={{ userSelect: 'none' }}>
          <Button
            ref={menuTriggerRef}
            {...menuTriggerProps}
            variant="bare"
            aria-label={t('Menu')}
            onPress={onMenuOpen}
            style={{ padding: 4 }}
          >
            <SvgDotsHorizontalTriple
              width={14}
              height={14}
              style={{ color: theme.pageTextLight }}
            />
          </Button>
          {menu}
        </View>
      </View>

      <View style={{ padding: '14px 16px 16px' }}>{headline}</View>

      {!collapsed && children && (
        <View
          style={{
            borderTop: `1px solid ${theme.tableBorder}`,
            padding: '12px 16px 14px',
            gap: 8,
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}

type SummaryRowProps = {
  label: ReactNode;
  value: ReactNode;
  emphasized?: boolean;
};

/** A single "label ........ value" line in a summary breakdown. */
export function SummaryRow({ label, value, emphasized }: SummaryRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: 13,
        color: emphasized ? theme.pageText : theme.pageTextLight,
      }}
    >
      <View style={{ minWidth: 0 }}>{label}</View>
      <View
        style={{
          ...styles.tnum,
          fontWeight: emphasized ? 600 : 500,
          color: theme.pageText,
          flexShrink: 0,
        }}
      >
        {value}
      </View>
    </View>
  );
}
