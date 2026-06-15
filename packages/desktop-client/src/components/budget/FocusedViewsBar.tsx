import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { FocusedViewDefinition } from '@actual-app/core/types/prefs';

import { useContextMenu } from '#hooks/useContextMenu';
import { BUILT_IN_VIEWS } from '#hooks/useFocusedViews';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type FocusedViewsBarProps = {
  views: FocusedViewDefinition[];
  activeViewId: string | null;
  isCollapsed: boolean;
  startOffset: number;
  maxWidth?: number;
  availableBuiltInViews: {
    underfunded: boolean;
    overfunded: boolean;
    overspent: boolean;
  };
  viewOrder: string[];
  hiddenViews: string[];
  showHiddenViews: boolean;
  onSelectView: (id: string | null) => void;
  onCreateView: () => void;
  onEditView: (id: string) => void;
  onDeleteView: (id: string) => void;
  onReorderViews: () => void;
  onToggleViewVisibility: (id: string) => void;
  onToggleShowHiddenViews: () => void;
};

type ViewPillProps = {
  id: string | null;
  label: string;
  isActive: boolean;
  isOverspent?: boolean;
  isCustom?: boolean;
  isHidden?: boolean;
  isGreyedOut?: boolean;
  showHiddenViews?: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReorderViews?: () => void;
  onToggleVisibility?: () => void;
  onToggleShowHiddenViews?: () => void;
};

function ViewPill({
  id,
  label,
  isActive,
  isOverspent,
  isCustom,
  isHidden,
  isGreyedOut,
  showHiddenViews,
  onClick,
  onEdit,
  onDelete,
  onReorderViews,
  onToggleVisibility,
  onToggleShowHiddenViews,
}: ViewPillProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { menuOpen, setMenuOpen, handleContextMenu, resetPosition, position } =
    useContextMenu();
  const triggerRef = useRef(null);

  let pillBackground = isActive
    ? theme.buttonPrimaryBackground
    : theme.buttonNormalBackground;
  let pillColor = isActive ? theme.buttonPrimaryText : theme.buttonNormalText;
  let pillBorder = '1px solid transparent';

  if (isOverspent) {
    if (isActive) {
      pillBackground = theme.budgetNumberNegative;
      pillColor = theme.buttonPrimaryText;
      pillBorder = '1px solid ' + theme.budgetNumberNegative;
    } else {
      pillBackground = theme.errorBackground;
      pillColor = theme.errorTextDark;
      pillBorder = '1px solid ' + theme.errorText;
    }
  }

  const confirmDelete = () => {
    if (!onDelete) {
      return;
    }

    dispatch(
      pushModal({
        modal: {
          name: 'confirm-delete',
          options: {
            message: t('Are you sure you want to delete the view "{{name}}"?', {
              name: label,
            }),
            onConfirm: onDelete,
          },
        },
      }),
    );
  };

  const hasContextMenu =
    isCustom || onReorderViews || onToggleVisibility || onToggleShowHiddenViews;

  return (
    <View
      ref={triggerRef}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 6,
        flexShrink: 0,
        opacity: isGreyedOut ? 0.33 : undefined,
      }}
    >
      <Button
        variant="bare"
        aria-label={
          id === null ? label : t('Show {{name}} view', { name: label })
        }
        style={{
          padding: '4px 12px',
          backgroundColor: pillBackground,
          color: pillColor,
          borderRadius: 4,
          border: pillBorder,
        }}
        onClick={onClick}
        onContextMenu={hasContextMenu ? handleContextMenu : undefined}
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

export function FocusedViewsBar({
  views,
  activeViewId,
  isCollapsed,
  startOffset,
  maxWidth,
  availableBuiltInViews,
  viewOrder,
  hiddenViews,
  showHiddenViews,
  onSelectView,
  onCreateView,
  onEditView,
  onDeleteView,
  onReorderViews,
  onToggleViewVisibility,
  onToggleShowHiddenViews,
}: FocusedViewsBarProps) {
  const { t } = useTranslation();

  if (isCollapsed) {
    return null;
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: startOffset,
        paddingRight: 10,
        maxWidth,
        marginTop: 8,
        marginBottom: 12,
        flexShrink: 0,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 1,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <ViewPill
          id={null}
          label={t('All')}
          isActive={activeViewId === null}
          onClick={() => onSelectView(null)}
          onToggleShowHiddenViews={
            hiddenViews.length > 0 ? onToggleShowHiddenViews : undefined
          }
          showHiddenViews={showHiddenViews}
        />

        {viewOrder.map(viewId => {
          const isHidden = hiddenViews.includes(viewId);
          if (isHidden && !showHiddenViews) return null;

          const pillProps = {
            key: viewId,
            id: viewId,
            isActive: activeViewId === viewId,
            isHidden,
            isGreyedOut: isHidden && showHiddenViews,
            onClick: () => onSelectView(viewId),
            onReorderViews,
            onToggleVisibility: () => onToggleViewVisibility(viewId),
          };

          const isBuiltIn = (
            Object.values(BUILT_IN_VIEWS) as string[]
          ).includes(viewId);

          if (isBuiltIn) {
            switch (viewId) {
              case BUILT_IN_VIEWS.OVERSPENT:
                return availableBuiltInViews.overspent ? (
                  <ViewPill {...pillProps} label={t('Overspent')} isOverspent />
                ) : null;
              case BUILT_IN_VIEWS.UNDERFUNDED:
                return availableBuiltInViews.underfunded ? (
                  <ViewPill {...pillProps} label={t('Underfunded')} />
                ) : null;
              case BUILT_IN_VIEWS.OVERFUNDED:
                return availableBuiltInViews.overfunded ? (
                  <ViewPill {...pillProps} label={t('Overfunded')} />
                ) : null;
              case BUILT_IN_VIEWS.MONEY_AVAILABLE:
                return <ViewPill {...pillProps} label={t('Money Available')} />;
              default:
                return null;
            }
          } else {
            const customView = views.find(v => v.id === viewId);
            if (!customView) return null;

            return (
              <ViewPill
                {...pillProps}
                label={customView.name}
                isCustom
                onEdit={() => onEditView(customView.id)}
                onDelete={() => onDeleteView(customView.id)}
              />
            );
          }
        })}

        <Button
          variant="bare"
          onClick={onCreateView}
          style={{
            padding: '4px 8px',
            backgroundColor: theme.buttonNormalBackground,
            color: theme.buttonNormalText,
            borderRadius: 4,
            border: 'none',
          }}
          aria-label={t('Add custom view')}
        >
          <SvgAdd style={{ width: 14, height: 14 }} />
        </Button>
      </View>
    </View>
  );
}
