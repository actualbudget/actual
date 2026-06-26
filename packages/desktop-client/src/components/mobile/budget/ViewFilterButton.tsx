import React, { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgFilter, SvgFilterOutline } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import type { FocusedViewDefinition } from '@actual-app/core/types/prefs';

import { BUILT_IN_VIEWS } from '#hooks/useFocusedViews';

type ViewFilterButtonProps = {
  views: FocusedViewDefinition[];
  viewOrder: string[];
  hiddenViews: string[];
  activeViewId: string | null;
  availableBuiltInViews: {
    underfunded: boolean;
    overfunded: boolean;
    overspent: boolean;
  };
  onSelectView: (id: string | null) => void;
};

export function ViewFilterButton({
  views,
  viewOrder,
  hiddenViews,
  activeViewId,
  availableBuiltInViews,
  onSelectView,
}: ViewFilterButtonProps) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

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

  // Build the list of view items to render
  const viewItems: Array<{ id: string | null; label: ReactNode }> = [
    { id: null, label: <Trans>All</Trans> },
  ];

  for (const viewId of viewOrder) {
    // Skip hidden views on mobile
    if (hiddenViews.includes(viewId)) {
      continue;
    }

    if (isBuiltIn(viewId)) {
      const label = getBuiltInLabel(viewId);
      if (label) {
        viewItems.push({ id: viewId, label });
      }
    } else {
      const customView = views.find(v => v.id === viewId);
      if (customView) {
        viewItems.push({ id: viewId, label: customView.name });
      }
    }
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(!isOpen)}
        aria-label={t('Filter views')}
        style={{ margin: 10, position: 'relative' }}
      >
        {isFilterActive ? (
          <SvgFilter
            width={18}
            height={17}
            style={{
              color: theme.mobileHeaderText,
              transform: 'translateY(2px)',
            }}
          />
        ) : (
          <SvgFilterOutline
            width={18}
            height={17}
            style={{
              color: theme.mobileHeaderText,
              transform: 'translateY(2px)',
            }}
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
        {viewItems.map(item => {
          const isActive =
            item.id === activeViewId ||
            (item.id === null && activeViewId === null);

          return (
            <Button
              key={item.id ?? '__all'}
              variant="bare"
              onPress={() => {
                onSelectView(item.id);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                justifyContent: 'flex-start',
                borderRadius: 4,
                backgroundColor: isActive
                  ? theme.buttonPrimaryBackground
                  : 'transparent',
                color: isActive
                  ? theme.buttonPrimaryText
                  : theme.buttonNormalText,
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
              }}
            >
              {item.label}
            </Button>
          );
        })}
      </Popover>
    </>
  );
}
