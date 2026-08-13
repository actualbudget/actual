import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgAdd,
  SvgCheveronDown,
  SvgFilter,
} from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { FocusedViewDefinition } from '@actual-app/core/types/prefs';

import { DropHighlight, useDraggable, useDroppable } from '#components/sort';
import type { DragState, OnDropCallback } from '#components/sort';
import { useContextMenu } from '#hooks/useContextMenu';
import { useDragRef } from '#hooks/useDragRef';
import { BUILT_IN_VIEWS } from '#hooks/useFocusedViews';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type ViewListItemProps = {
  viewId: string;
  label: ReactNode;
  isActive: boolean;
  isCustom: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReorderViewToTarget?: OnDropCallback;
  dragState?: DragState<FocusedViewDragItem> | null;
  onDragChange?: (drag: DragState<FocusedViewDragItem>) => void;
};

type FocusedViewDragItem = {
  id: string;
};

function ViewListItem({
  viewId: _viewId,
  label,
  isActive,
  isCustom,
  onSelect,
  onEdit,
  onDelete,
  onReorderViewToTarget,
  dragState,
  onDragChange,
}: ViewListItemProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLDivElement>(null);

  const hasContextMenu = Boolean(onEdit || onDelete);

  const dragging = dragState?.item?.id === _viewId;
  const canDrag = _viewId !== '__all';

  const { dragRef } = useDraggable({
    type: 'view',
    onDragChange:
      onDragChange ||
      (() => {
        /* noop */
      }),
    item: { id: _viewId },
    canDrag,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: 'view',
    id: _viewId,
    onDrop:
      onReorderViewToTarget ||
      (() => {
        /* noop */
      }),
  });

  const dispatch = useDispatch();

  function confirmDelete() {
    dispatch(
      pushModal({
        modal: {
          name: 'confirm-delete',
          options: {
            message: <Trans>Are you sure you want to delete this view?</Trans>,
            onConfirm: () => {
              onDelete?.();
            },
          },
        },
      }),
    );
  }

  const { handleContextMenu } = useContextMenu({
    triggerRef,
    enabled: hasContextMenu,
    items: [
      isCustom && {
        name: 'edit',
        text: t('Edit'),
        onClick: onEdit,
      },
      isCustom && {
        name: 'delete',
        text: t('Delete'),
        onClick: confirmDelete,
      },
    ],
  });

  return (
    <View
      innerRef={canDrag ? dropRef : undefined}
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: dragging
          ? theme.tableRowBackgroundHighlight
          : 'transparent',
      }}
    >
      {canDrag && <DropHighlight pos={dropPos} offset={{ top: 1 }} />}
      <View
        innerRef={(node: HTMLDivElement | null) => {
          triggerRef.current = node;
          if (canDrag && handleDragRef) {
            handleDragRef(node);
          }
        }}
        style={{
          width: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          '& .hover-visible': {
            opacity: 0,
          },
          '&:hover .hover-visible, &:focus-within .hover-visible': {
            opacity: 1,
          },
        }}
      >
        <Button
          variant="bare"
          onPress={onSelect}
          style={{
            width: '100%',
            padding: '8px 12px',
            paddingRight: hasContextMenu ? 32 : 12,
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
          <Button
            variant="bare"
            className="hover-visible"
            aria-label={t('View actions')}
            style={{
              position: 'absolute',
              right: 8,
              padding: 4,
              borderRadius: 4,
              color: isActive
                ? theme.buttonPrimaryText
                : theme.buttonNormalText,
            }}
            onPress={handleContextMenu}
          >
            <SvgCheveronDown style={{ width: 14, height: 14 }} />
          </Button>
        )}
      </View>
    </View>
  );
}

type BudgetFilterButtonProps = {
  views: FocusedViewDefinition[];
  viewOrder: string[];
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
  onReorderViewToTarget?: OnDropCallback;
};

export function BudgetFilterButton({
  views,
  viewOrder,
  activeViewId,
  availableBuiltInViews,
  onSelectView,
  onCreateView,
  onEditView,
  onDeleteView,
  onReorderViewToTarget,
}: BudgetFilterButtonProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dragState, setDragState] =
    useState<DragState<FocusedViewDragItem> | null>(null);

  const isFilterActive = activeViewId !== null;

  function getBuiltInLabel(viewId: string): ReactNode | null {
    switch (viewId) {
      case BUILT_IN_VIEWS.UNDERFUNDED:
        return availableBuiltInViews.underfunded ? (
          <Trans>Underfunded</Trans>
        ) : null;
      case BUILT_IN_VIEWS.OVERFUNDED:
        return availableBuiltInViews.overfunded ? (
          <Trans>Overfunded</Trans>
        ) : null;
      case BUILT_IN_VIEWS.OVERSPENT:
        return availableBuiltInViews.overspent ? (
          <Trans>Overspent</Trans>
        ) : null;
      case BUILT_IN_VIEWS.MONEY_AVAILABLE:
        return <Trans>Money Available</Trans>;
      default:
        return null;
    }
  }

  function isBuiltIn(viewId: string): boolean {
    return Object.values(BUILT_IN_VIEWS).some(id => id === viewId);
  }

  const builtInViewIds = viewOrder.filter(isBuiltIn);
  const customViewIds = viewOrder.filter(viewId => !isBuiltIn(viewId));
  const hasAvailableBuiltInViews = builtInViewIds.some(
    viewId => getBuiltInLabel(viewId) !== null,
  );
  const hasCustomViews = customViewIds.some(viewId =>
    views.some(view => view.id === viewId),
  );

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
        <SvgFilter width={14} height={14} style={{ color: 'currentColor' }} />
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
          label={<Trans>All</Trans>}
          isActive={activeViewId === null}
          isCustom={false}
          onSelect={() => {
            onSelectView(null);
            setIsOpen(false);
          }}
        />

        {builtInViewIds.map(viewId => {
          const label = getBuiltInLabel(viewId);
          if (!label) return null;

          return (
            <ViewListItem
              key={viewId}
              viewId={viewId}
              label={label}
              isActive={activeViewId === viewId}
              isCustom={false}
              onSelect={() => {
                onSelectView(viewId);
                setIsOpen(false);
              }}
              onReorderViewToTarget={onReorderViewToTarget}
              dragState={dragState}
              onDragChange={drag => {
                if (drag.type === 'end') {
                  setDragState(null);
                } else {
                  setDragState(drag);
                }
              }}
            />
          );
        })}

        {hasAvailableBuiltInViews && hasCustomViews && (
          <View
            aria-hidden="true"
            style={{
              margin: '4px 0',
              borderTop: `2px solid ${theme.tableBorderSeparator}`,
            }}
          />
        )}

        {customViewIds.map(viewId => {
          const customView = views.find(view => view.id === viewId);
          if (!customView) return null;

          return (
            <ViewListItem
              key={viewId}
              viewId={viewId}
              label={customView.name}
              isActive={activeViewId === viewId}
              isCustom
              onSelect={() => {
                onSelectView(viewId);
                setIsOpen(false);
              }}
              onEdit={() => onEditView(customView.id)}
              onDelete={() => onDeleteView(customView.id)}
              onReorderViewToTarget={onReorderViewToTarget}
              dragState={dragState}
              onDragChange={drag => {
                if (drag.type === 'end') {
                  setDragState(null);
                } else {
                  setDragState(drag);
                }
              }}
            />
          );
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
