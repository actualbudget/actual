import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ExpandChevron } from './ExpandChevron';

import { AccountTypeAutocomplete } from '@desktop-client/components/autocomplete/AccountTypeAutocomplete';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import type { Binding, SheetFields } from '@desktop-client/spreadsheet';

type TypeGroupHeaderProps<FieldName extends SheetFields<'account'>> = {
  typeName: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  query?: Binding<'account', FieldName>;
};

/**
 * Type group header with a collapse/expand chevron, inline rename, and
 * a right-click context menu offering Rename and Delete.
 *
 * - Rename replaces the type name on all accounts in this group.
 * - Delete clears the type (sets to null) on all accounts in this group.
 */
export function TypeGroupHeader<FieldName extends SheetFields<'account'>>({
  typeName,
  isExpanded,
  onToggle,
  onRename,
  onDelete,
  query,
}: TypeGroupHeaderProps<FieldName>) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLDivElement>(null);
  const { setMenuOpen, menuOpen, handleContextMenu, position } =
    useContextMenu();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraftValue, setRenameDraftValue] = useState(typeName);
  const hasSubmittedRenameRef = useRef(false);
  const isEventInsidePopover = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('[data-popover]');

  function submitRename(rawValue: string) {
    if (hasSubmittedRenameRef.current) {
      return;
    }

    hasSubmittedRenameRef.current = true;
    const trimmedValue = rawValue.trim();
    if (trimmedValue !== '' && trimmedValue !== typeName) {
      onRename(trimmedValue);
    }
  }

  return (
    <View
      innerRef={triggerRef}
      onContextMenu={handleContextMenu}
      onPointerDownCapture={e => {
        if (isEventInsidePopover(e.target)) {
          return;
        }
        e.stopPropagation();
      }}
      onPointerDown={e => {
        if (isEventInsidePopover(e.target)) {
          return;
        }
        e.stopPropagation();
      }}
      onClick={e => {
        if (!isRenaming && !isEventInsidePopover(e.target)) {
          onToggle();
        }
      }}
      style={{
        ...styles.smallText,
        color: theme.sidebarItemText,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 4,
        paddingRight: 15,
        marginTop: 3,
        marginBottom: 1,
        textTransform: 'uppercase',
        borderLeft: '4px solid transparent',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <ExpandChevron isExpanded={isExpanded} onToggle={onToggle} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: 1 }}>
        <AlignedText
          left={typeName}
          right={
            query ? (
              <span
                style={{ fontStyle: 'italic', textDecoration: 'underline' }}
              >
                <CellValue binding={query} type="financial" />
              </span>
            ) : null
          }
        />
      </View>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
        style={{ width: 200, margin: 1 }}
        isNonModal
        {...position}
      >
        <Menu
          onMenuSelect={menuAction => {
            switch (menuAction) {
              case 'rename': {
                hasSubmittedRenameRef.current = false;
                setRenameDraftValue(typeName);
                setIsRenaming(true);
                break;
              }
              case 'delete': {
                onDelete();
                break;
              }
              default: {
                throw new Error(`Unrecognized menu option: ${menuAction}`);
              }
            }
            setMenuOpen(false);
          }}
          items={[
            { name: 'rename', text: t('Rename') },
            { name: 'delete', text: t('Delete') },
          ]}
        />
      </Popover>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isRenaming}
        onOpenChange={nextOpen => {
          if (!nextOpen) {
            submitRename(renameDraftValue);
            setIsRenaming(false);
          }
        }}
        style={{ width: 200, padding: 5 }}
        isNonModal
        {...position}
      >
        <AccountTypeAutocomplete
          value={renameDraftValue}
          embedded
          onUpdate={(_id, rawInputValue) => {
            setRenameDraftValue(rawInputValue);
          }}
          onSelect={(newType, rawInputValue) => {
            submitRename(newType ?? rawInputValue);
            setIsRenaming(false);
          }}
        />
      </Popover>
    </View>
  );
}
