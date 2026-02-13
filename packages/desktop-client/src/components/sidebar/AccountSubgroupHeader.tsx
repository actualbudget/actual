import { useState } from 'react';

import { AlignedText } from '@actual-app/components/aligned-text';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { ExpandChevron } from './ExpandChevron';

import { FinancialText } from '@desktop-client/components/FinancialText';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useFormat } from '@desktop-client/hooks/useFormat';
import type { Binding, SheetFields } from '@desktop-client/spreadsheet';

export type AccountSubgroupHeaderProps<
  FieldName extends SheetFields<'account'>,
> = {
  subgroupName: string;
  isExpanded: boolean;
  onToggle: () => void;
  query?: Binding<'account', FieldName>;
};

/**
 * Account subgroup header with a collapse/expand chevron and optional
 * aggregate balance.
 */
export function AccountSubgroupHeader<
  FieldName extends SheetFields<'account'>,
>({
  subgroupName,
  isExpanded,
  onToggle,
  query,
}: AccountSubgroupHeaderProps<FieldName>) {
  const format = useFormat();
  const [showChevron, setShowChevron] = useState(false);
  const subtotalValue = query ? (
    <CellValue binding={query} type="financial">
      {({ value }) => (
        <FinancialText style={styles.tnum}>
          <PrivacyFilter>{format(value, 'financial')}</PrivacyFilter>
        </FinancialText>
      )}
    </CellValue>
  ) : null;

  const headerRow = (
    <View
      onMouseEnter={() => setShowChevron(true)}
      onMouseLeave={() => setShowChevron(false)}
      onFocusCapture={() => setShowChevron(true)}
      onBlurCapture={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setShowChevron(false);
        }
      }}
      onPointerDownCapture={e => {
        e.stopPropagation();
      }}
      onPointerDown={e => e.stopPropagation()}
      onClick={() => onToggle()}
      style={{
        ...styles.smallText,
        color: theme.sidebarTextLight,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 7,
        paddingRight: 15,
        marginTop: 3,
        marginBottom: 1,
        borderLeft: '4px solid transparent',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <ExpandChevron
        isExpanded={isExpanded}
        onToggle={onToggle}
        style={{
          position: 'absolute',
          left: -4,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: showChevron ? 1 : 0,
          pointerEvents: showChevron ? 'auto' : 'none',
          transition: 'opacity 0.15s ease',
        }}
      />
      <View
        style={{ ...styles.verySmallText, flex: 1, minWidth: 0, marginLeft: 1 }}
      >
        <AlignedText
          left={subgroupName}
          right={!isExpanded ? subtotalValue : null}
        />
      </View>
    </View>
  );

  if (!query || !isExpanded) {
    return headerRow;
  }

  return (
    <Tooltip
      content={<View style={{ padding: '6px 8px' }}>{subtotalValue}</View>}
      style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
      placement="right top"
      triggerProps={{ delay: 500, closeDelay: 150 }}
    >
      {headerRow}
    </Tooltip>
  );
}
