import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { DragItem } from 'react-aria';
import {
  Dialog,
  DialogTrigger,
  DropIndicator,
  GridList,
  GridListItem,
  useDragAndDrop,
} from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useHoverMenu } from '@actual-app/components/hooks/useHoverMenu';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { SvgMenu } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { DashboardPageEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { useNavigate } from '#hooks/useNavigate';
import {
  useCreateDashboardPageMutation,
  useMoveDashboardPageMutation,
} from '#reports/mutations';

type DashboardSelectorProps = {
  dashboards: readonly DashboardPageEntity[];
  currentDashboard: DashboardPageEntity;
};

export function DashboardSelector({
  dashboards,
  currentDashboard,
}: DashboardSelectorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menu = useHoverMenu();
  const triggerRef = menu.triggerRef;
  const menuOpen = menu.isOpen;
  const setMenuOpen = (open: boolean) => (open ? menu.open() : menu.close());
  const gridListRef = useRef<HTMLDivElement>(null);
  const addDashboardButtonRef = useRef<HTMLButtonElement>(null);

  const createDashboardPageMutation = useCreateDashboardPageMutation();
  const moveDashboardPageMutation = useMoveDashboardPageMutation();

  const handleAddDashboard = async () => {
    const defaultName = t('New dashboard');
    createDashboardPageMutation.mutate(
      { name: defaultName },
      {
        onSuccess: id => {
          void navigate(`/reports/${id}`);
        },
      },
    );
  };

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(key => ({ 'text/plain': String(key) }) satisfies DragItem),
    renderDropIndicator: target => (
      <DropIndicator
        target={target}
        className={css({
          '&[data-drop-target]': {
            height: 2,
            margin: '0 5px',
            backgroundColor: theme.tableBorderSeparator,
            borderRadius: 2,
          },
        })}
      />
    ),
    onReorder: event => {
      const [key] = event.keys;
      moveDashboardPageMutation.mutate({
        id: String(key),
        targetId: getMoveTargetId(
          dashboards,
          String(event.target.key),
          event.target.dropPosition,
        ),
      });
    },
  });

  // The arrow keys stay inside the GridList, so move focus between the last
  // dashboard and the add button here, as the `Menu` component did
  const handleKeyDownCapture = (event: KeyboardEvent<HTMLElement>) => {
    const lastDashboard = dashboards.at(-1);
    const lastDashboardRow = lastDashboard
      ? gridListRef.current?.querySelector<HTMLElement>(
          `[data-key="${CSS.escape(lastDashboard.id)}"]`,
        )
      : null;
    if (!lastDashboardRow) {
      return;
    }

    if (event.key === 'ArrowDown' && event.target === lastDashboardRow) {
      event.preventDefault();
      event.stopPropagation();
      addDashboardButtonRef.current?.focus();
    } else if (
      event.key === 'ArrowUp' &&
      event.target === addDashboardButtonRef.current
    ) {
      event.preventDefault();
      event.stopPropagation();
      lastDashboardRow.focus();
    }
  };

  return (
    <DialogTrigger>
      <Button
        ref={triggerRef}
        {...menu.triggerProps}
        onPress={menu.toggle}
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 'auto',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <View
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 'auto',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            textAlign: 'center',
          }}
        >
          {currentDashboard.name}
        </View>
        <SvgExpandArrow
          width={7}
          height={7}
          style={{
            flexGrow: 0,
            flexShrink: 0,
            flexBasis: 'auto',
            marginLeft: 5,
          }}
        />
      </Button>

      {menuOpen && (
        <Popover
          {...menu.popoverProps}
          triggerRef={triggerRef}
          isOpen
          onOpenChange={setMenuOpen}
          placement="bottom start"
        >
          <Dialog>
            <View onKeyDownCapture={handleKeyDownCapture}>
              <GridList
                ref={gridListRef}
                aria-label={t('Dashboards')}
                items={dashboards}
                dependencies={[currentDashboard.id]}
                dragAndDropHooks={dragAndDropHooks}
                autoFocus
                onAction={id => {
                  void navigate(`/reports/${id}`);
                  setMenuOpen(false);
                }}
                className={css({ outline: 'none' })}
              >
                {dashboard => (
                  <DashboardSelectorItem
                    dashboard={dashboard}
                    isCurrent={dashboard.id === currentDashboard.id}
                  />
                )}
              </GridList>
              <View
                style={{
                  margin: '3px 0px',
                  borderTop: '1px solid ' + theme.menuBorder,
                }}
              />
              <Button
                ref={addDashboardButtonRef}
                variant="bare"
                onPress={() => {
                  void handleAddDashboard();
                  setMenuOpen(false);
                }}
                className={css({
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: 10,
                  borderRadius: 0,
                  ...menuItemStyle,
                })}
              >
                <Trans>Add new dashboard</Trans>
              </Button>
            </View>
          </Dialog>
        </Popover>
      )}
    </DialogTrigger>
  );
}

type DashboardSelectorItemProps = {
  dashboard: DashboardPageEntity;
  isCurrent: boolean;
};

function DashboardSelectorItem({
  dashboard,
  isCurrent,
}: DashboardSelectorItemProps) {
  const { t } = useTranslation();

  return (
    <GridListItem
      id={dashboard.id}
      textValue={dashboard.name}
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        padding: '10px 10px 10px 5px',
        outline: 'none',
        ...menuItemStyle,
        '&[data-dragging]': {
          opacity: 0.5,
        },
      })}
    >
      <Button
        slot="drag"
        variant="bare"
        aria-label={t('Reorder {{ dashboardName }}', {
          dashboardName: dashboard.name,
        })}
        style={{
          cursor: 'grab',
          color: theme.pageTextSubdued,
          padding: 3,
        }}
      >
        <SvgMenu width={10} height={10} />
      </Button>
      <Text style={{ fontWeight: isCurrent ? 600 : undefined }}>
        {dashboard.name}
      </Text>
    </GridListItem>
  );
}

// `dashboard-move` places a dashboard before its target, or at the end
// when the target is null
function getMoveTargetId(
  dashboards: readonly DashboardPageEntity[],
  dropTargetId: string,
  dropPosition: 'before' | 'after' | 'on',
) {
  if (dropPosition !== 'after') {
    return dropTargetId;
  }
  const dropTargetIndex = dashboards.findIndex(
    dashboard => dashboard.id === dropTargetId,
  );
  return dashboards[dropTargetIndex + 1]?.id ?? null;
}

// Matches the item style of the `Menu` component
const menuItemStyle = {
  color: theme.menuItemText,
  cursor: 'default',
  '&[data-hovered], &[data-focus-visible]': {
    backgroundColor: theme.menuItemBackgroundHover,
    color: theme.menuItemTextHover,
  },
};
