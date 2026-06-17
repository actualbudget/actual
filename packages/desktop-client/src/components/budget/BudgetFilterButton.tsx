import React, { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgAdd,
  SvgFilter,
  SvgFilterOutline,
} from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { FocusedViewDefinition } from '@actual-app/core/types/prefs';

import { useContextMenu } from '#hooks/useContextMenu';
import { BUILT_IN_VIEWS } from '#hooks/useFocusedViews';

type ViewListItemProps = {
  viewId: string;
  label: string;
  isActive: boolean;
  isCustom: boolean;
  isHidden?: boolean;
  showHiddenViews?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReorderViews?: () => void;
  onToggleVisibility?: () => void;
  onToggleShowHiddenViews?: () => void;
};

function ViewListItem({
  viewId: _viewId,
  label,
  isActive,
  isCustom,
  isHidden,
  showHiddenViews,
  onSelect,
  onEdit,
  onDelete,
  onReorderViews,
  onToggleVisibility,
  onToggleShowHiddenViews,
}: ViewListItemProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLDivElement>(null);

  const hasContextMenu = Boolean(
    onEdit ||
    onDelete ||
    onReorderViews ||
    onToggleVisibility ||
    onToggleShowHiddenViews,
  );

  const { position, menuOpen, setMenuOpen, handleContextMenu, resetPosition } =
    useContextMenu();

  function confirmDelete() {
    if (window.confirm(t('Are you sure you want to delete this view?'))) {
      onDelete?.();
    }
  }

  return (
    <View
      innerRef={triggerRef}
      onContextMenu={hasContextMenu ? handleContextMenu : undefined}
      style={{
        width: '100%',
      }}
    >
      <Button
        variant="bare"
        onPress={onSelect}
        style={{
          width: '100%',
          padding: '8px 12px',
          justifyContent: 'flex-start',
          borderRadius: 4,
          backgroundColor: isActive
            ? theme.buttonPrimaryBackground
            : 'transparent',
          color: isActive ? theme.buttonPrimaryText : theme.buttonNormalText,
          fontWeight: isActive ? 600 : 400,
          fontSize: 14,
        }}
      >
        {label}
      </Button>

      {hasContextMenu && (
        <Popover
          triggerRef={triggerRef}
          placement="bottom start"
          isOpen={menuOpen}
          onOpenChange={isOpen => {
            if (!isOpen) {
              setMenuOpen(false);
              resetPosition();
            }
          }}
          isNonModal
          style={{ margin: 1 }}
          {...position}
        >
          <Menu
            onMenuSelect={item => {
              switch (item) {
                case 'edit':
                  onEdit?.();
                  break;
                case 'reorder':
                  onReorderViews?.();
                  break;
                case 'delete':
                  confirmDelete();
                  break;
                case 'toggle-visibility':
                  onToggleVisibility?.();
                  break;
                case 'toggle-show-hidden':
                  onToggleShowHiddenViews?.();
                  break;
                default:
                  break;
              }
              setMenuOpen(false);
            }}
            items={
              [
                isCustom && { name: 'edit', text: t('Edit view') },
                onToggleVisibility && {
                  name: 'toggle-visibility',
                  text: isHidden ? t('Show view') : t('Hide view'),
                },
                onToggleShowHiddenViews && {
                  name: 'toggle-show-hidden',
                  text: showHiddenViews
                    ? t('Hide hidden views')
                    : t('Show hidden views'),
                },
                onReorderViews && { name: 'reorder', text: t('Reorder views') },
                isCustom && Menu.line,
                isCustom && { name: 'delete', text: t('Delete view') },
              ].filter(Boolean) as MenuItem[]
            }
          />
        </Popover>
      )}
    </View>
  );
}

type BudgetFilterButtonProps = {
  views: FocusedViewDefinition[];
  viewOrder: string[];
  hiddenViews: string[];
  showHiddenViews: boolean;
  activeViewId: string | null;
  availableBuiltInViews: {
    underfunded: boolean;
    overfunded: boolean;
    overspent: boolean;
  };
  onSelectView: (id: string | null) => void;
  onCreateView: () => void;
  onEditView: (id: string) => void;
  onDeleteView: (id: string) => void;
  onReorderViews: () => void;
  onToggleViewVisibility: (id: string) => void;
  onToggleShowHiddenViews: () => void;
};

export function BudgetFilterButton({
  views,
  viewOrder,
  hiddenViews,
  showHiddenViews,
  activeViewId,
  availableBuiltInViews,
  onSelectView,
  onCreateView,
  onEditView,
  onDeleteView,
  onReorderViews,
  onToggleViewVisibility,
  onToggleShowHiddenViews,
}: BudgetFilterButtonProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const isFilterActive = activeViewId !== null;

  function getBuiltInLabel(viewId: string): string | null {
    switch (viewId) {
      case BUILT_IN_VIEWS.UNDERFUNDED:
        return availableBuiltInViews.underfunded ? t('Underfunded') : null;
      case BUILT_IN_VIEWS.OVERFUNDED:
        return availableBuiltInViews.overfunded ? t('Overfunded') : null;
      case BUILT_IN_VIEWS.OVERSPENT:
        return availableBuiltInViews.overspent ? t('Overspent') : null;
      case BUILT_IN_VIEWS.MONEY_AVAILABLE:
        return t('Money Available');
      default:
        return null;
    }
  }

  function isBuiltIn(viewId: string): boolean {
    return Object.values(BUILT_IN_VIEWS).some(id => id === viewId);
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(!isOpen)}
        aria-label={t('Filter views')}
        style={{
          padding: 2,
          marginLeft: 5,
          marginTop: 1,
          display: 'flex',
          alignItems: 'center',
        }}
        className={!isFilterActive && !isOpen ? 'hover-visible' : undefined}
      >
        {isFilterActive ? (
          <SvgFilter width={14} height={14} style={{ color: 'currentColor' }} />
        ) : (
          <SvgFilterOutline
            width={14}
            height={14}
            style={{ color: 'currentColor' }}
          />
        )}
      </Button>

      <Popover
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
        placement="bottom end"
        style={{
          padding: 4,
          maxHeight: 300,
          overflowY: 'auto',
          minWidth: 180,
        }}
      >
        <ViewListItem
          viewId="__all"
          label={t('All')}
          isActive={activeViewId === null}
          isCustom={false}
          onSelect={() => {
            onSelectView(null);
            setIsOpen(false);
          }}
        />

        {viewOrder.map(viewId => {
          const isHidden = hiddenViews.includes(viewId);
          if (isHidden && !showHiddenViews) {
            return null;
          }

          if (isBuiltIn(viewId)) {
            const label = getBuiltInLabel(viewId);
            if (!label) return null;

            return (
              <ViewListItem
                key={viewId}
                viewId={viewId}
                label={label}
                isActive={activeViewId === viewId}
                isCustom={false}
                isHidden={isHidden}
                showHiddenViews={showHiddenViews}
                onSelect={() => {
                  onSelectView(viewId);
                  setIsOpen(false);
                }}
                onReorderViews={onReorderViews}
                onToggleVisibility={() => onToggleViewVisibility(viewId)}
                onToggleShowHiddenViews={onToggleShowHiddenViews}
              />
            );
          } else {
            const customView = views.find(v => v.id === viewId);
            if (!customView) return null;

            return (
              <ViewListItem
                key={viewId}
                viewId={viewId}
                label={customView.name}
                isActive={activeViewId === viewId}
                isCustom
                isHidden={isHidden}
                showHiddenViews={showHiddenViews}
                onSelect={() => {
                  onSelectView(viewId);
                  setIsOpen(false);
                }}
                onEdit={() => onEditView(customView.id)}
                onDelete={() => onDeleteView(customView.id)}
                onReorderViews={onReorderViews}
                onToggleVisibility={() => onToggleViewVisibility(viewId)}
                onToggleShowHiddenViews={onToggleShowHiddenViews}
              />
            );
          }
        })}

        <Button
          variant="bare"
          onPress={() => {
            onCreateView();
            setIsOpen(false);
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            justifyContent: 'flex-start',
            borderRadius: 4,
            color: theme.buttonNormalText,
            fontWeight: 400,
            fontSize: 14,
            marginTop: 4,
            borderTop: `1px solid ${theme.tableBorder}`,
          }}
        >
          <SvgAdd style={{ width: 14, height: 14, marginRight: 8 }} />
          <Trans>Add view</Trans>
        </Button>
      </Popover>
    </>
  );
}
