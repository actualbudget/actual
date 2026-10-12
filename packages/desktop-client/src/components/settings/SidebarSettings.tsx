import type { DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import {
  getDefaultSidebarMenuItems,
  moveSidebarMenuItem,
  parseSidebarStartPage,
} from '#components/sidebar/sidebarMenu';
import type { SidebarMenuItemId } from '#components/sidebar/sidebarMenu';
import { useSidebarMenuItemDetails } from '#components/sidebar/useSidebarMenuItemDetails';
import { useSidebarMenu } from '#hooks/useSidebarMenu';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { SidebarMenuListItem } from './SidebarMenuListItem';

export function SidebarSettings() {
  const { t } = useTranslation();
  const itemDetails = useSidebarMenuItemDetails();
  const { items, startPage, isItemAvailable, saveItems, saveStartPage } =
    useSidebarMenu();

  const availableItems = items.filter(item => isItemAvailable(item.id));
  const visibleItems = availableItems.filter(item => !item.hidden);

  const onToggleItem = (id: SidebarMenuItemId, isVisible: boolean) => {
    saveItems(
      items.map(item =>
        item.id === id ? { ...item, hidden: !isVisible } : item,
      ),
    );
  };

  const onResetToDefault = () => {
    const defaultItems = getDefaultSidebarMenuItems();
    saveItems(defaultItems);
    saveStartPage(parseSidebarStartPage(undefined, defaultItems));
  };

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(key => ({ 'text/plain': String(key) }) satisfies DragItem),
    renderDropIndicator: target => (
      <DropIndicator
        target={target}
        className={css({
          '&[data-drop-target]': {
            height: 4,
            backgroundColor: theme.tableBorderSeparator,
            opacity: 1,
            borderRadius: 4,
          },
        })}
      />
    ),
    onReorder: e => {
      const [key] = e.keys;
      saveItems(
        moveSidebarMenuItem(
          items,
          String(key),
          String(e.target.key),
          e.target.dropPosition,
        ),
      );
    },
  });

  return (
    <SettingsGroup title={t('Sidebar')}>
      <SettingsRow
        title={t('Pages')}
        description={t(
          'Choose which pages appear in the sidebar and drag them into the order you prefer. Pages you switch off can be found here in Settings.',
        )}
        control={
          <Button variant="bare" onPress={onResetToDefault}>
            <Trans>Reset to default</Trans>
          </Button>
        }
      >
        <GridList
          aria-label={t('Sidebar pages')}
          items={availableItems}
          dragAndDropHooks={dragAndDropHooks}
          dependencies={[itemDetails, startPage]}
          className={css({ display: 'flex', flexDirection: 'column' })}
        >
          {item => (
            <SidebarMenuListItem
              key={item.id}
              item={item}
              label={itemDetails[item.id].title}
              Icon={itemDetails[item.id].Icon}
              isStartPage={item.id === startPage}
              onToggle={onToggleItem}
            />
          )}
        </GridList>
      </SettingsRow>
      <SettingsRow
        title={t('Start page')}
        description={t('The page Actual shows when it opens.')}
        control={
          <Select
            aria-label={t('Start page')}
            value={startPage}
            onChange={saveStartPage}
            options={visibleItems.map(item => [
              item.id,
              itemDetails[item.id].title,
            ])}
          />
        }
      />
    </SettingsGroup>
  );
}
