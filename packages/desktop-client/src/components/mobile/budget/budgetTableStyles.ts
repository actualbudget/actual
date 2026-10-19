import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';

export const ROW_HEIGHT = 40;
export const ROW_PADDING_X = 14;
const AMOUNT_COLUMN_WIDTH = 70;
const BALANCE_COLUMN_WIDTH = 74;

export const LABEL_STYLE: CSSProperties = {
  ...styles.verySmallText,
  fontWeight: 600,
  color: theme.pageTextLight,
};

export const COLUMN_HEADING_STYLE: CSSProperties = {
  ...styles.verySmallText,
  fontWeight: 600,
  color: theme.tableHeaderText,
};

export const AMOUNT_TEXT_STYLE: CSSProperties = {
  ...styles.tnum,
  ...styles.verySmallText,
  color: theme.tableText,
  textAlign: 'right',
};

export const AMOUNT_WRAPPER_STYLE: CSSProperties = {
  width: '100%',
  flexDirection: 'row',
  justifyContent: 'flex-end',
};

export const CELL_BUTTON_STYLE: CSSProperties = {
  padding: 0,
  width: '100%',
  height: '100%',
  minWidth: 0,
  borderRadius: 0,
  justifyContent: 'flex-end',
};

export const ROW_PRESSABLE_STYLE: CSSProperties = {
  cursor: 'pointer',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
};

export function getRowGridStyle(amountColumns: number): CSSProperties {
  const amountTracks = Array(amountColumns)
    .fill(`${AMOUNT_COLUMN_WIDTH}px`)
    .join(' ');
  return {
    display: 'grid',
    gridTemplateColumns: `minmax(0, 1fr) ${amountTracks} ${BALANCE_COLUMN_WIDTH}px`,
    columnGap: spacing.xs,
    alignItems: 'center',
    paddingLeft: ROW_PADDING_X,
    paddingRight: ROW_PADDING_X,
  };
}

export const GROUP_AMOUNT_STYLE: CSSProperties = {
  ...styles.tnum,
  ...styles.verySmallText,
  color: theme.pageTextLight,
  textAlign: 'right',
};
