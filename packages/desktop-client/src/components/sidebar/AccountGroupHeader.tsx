import { useState } from 'react';
import { useMatch } from 'react-router';

import { AlignedText } from '@actual-app/components/aligned-text';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ExpandChevron } from './ExpandChevron';

import { Link } from '@desktop-client/components/common/Link';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import type { Binding, SheetFields } from '@desktop-client/spreadsheet';

const fontWeight = 600;

type AccountGroupHeaderProps<FieldName extends SheetFields<'account'>> = {
  name: string;
  to?: string;
  query: Binding<'account', FieldName>;
  isRoot?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
};

/**
 * Budget group / root header with a chevron, navigable link, and
 * aggregate balance.
 *
 * The chevron calls `onToggle` to expand/collapse. Clicking the text
 * navigates to the aggregate account page. `onPointerDown`
 * propagation is stopped on the outer container so the tree-row press
 * handler never fires - this ensures that only the chevron controls
 * expansion.
 */
export function AccountGroupHeader<FieldName extends SheetFields<'account'>>({
  name,
  to,
  query,
  isRoot,
  isExpanded,
  onToggle,
}: AccountGroupHeaderProps<FieldName>) {
  const match = useMatch({ path: to || '', end: !!isRoot });
  const [showChevron, setShowChevron] = useState(false);

  const wrapperStyle = {
    ...styles.smallText,
    fontWeight,
    color: match ? theme.sidebarItemTextSelected : theme.sidebarItemText,
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 15,
    paddingLeft: 8,
    marginTop: isRoot ? 15 : 13,
    marginBottom: isRoot ? 0 : 5,
    ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
    borderLeft: `4px solid ${match ? theme.sidebarItemAccentSelected : 'transparent'}`,
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    position: 'relative' as const,
  };

  const textContent = (
    <AlignedText
      style={{
        borderBottom: `1.5px solid ${theme.tableBorder}`,
        paddingBottom: '3px',
      }}
      left={name}
      right={<CellValue binding={query} type="financial" />}
    />
  );

  return (
    <View
      onMouseEnter={() => setShowChevron(true)}
      onMouseLeave={() => setShowChevron(false)}
      onFocusCapture={() => setShowChevron(true)}
      onBlurCapture={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setShowChevron(false);
        }
      }}
      onPointerDown={e => e.stopPropagation()}
      style={wrapperStyle}
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
      {to ? (
        <Link
          variant="internal"
          to={to}
          style={{
            flex: 1,
            minWidth: 0,
            textDecoration: 'none' as const,
            color: 'inherit',
          }}
        >
          {textContent}
        </Link>
      ) : (
        <View style={{ flex: 1, minWidth: 0 }}>{textContent}</View>
      )}
    </View>
  );
}
