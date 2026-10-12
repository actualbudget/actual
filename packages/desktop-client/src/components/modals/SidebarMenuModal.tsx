import { useState } from 'react';
import type { DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { SidebarMenuListItem } from '#components/modals/SidebarMenuListItem';
import {
  getDefaultSidebarMenuItems,
  moveSidebarMenuItem,
  parseSidebarStartPage,
} from '#components/sidebar/sidebarMenu';
import type {
  SidebarMenuItem,
  SidebarMenuItemId,
} from '#components/sidebar/sidebarMenu';
import { useSidebarMenuItemDetails } from '#components/sidebar/useSidebarMenuItemDetails';
import { useSidebarMenu } from '#hooks/useSidebarMenu';

export function SidebarMenuModal() {
  const { t } = useTranslation();
  const itemDetails = useSidebarMenuItemDetails();
  const {
    items: savedItems,
    startPage: savedStartPage,
    isItemAvailable,
    saveMenu,
  } = useSidebarMenu();

  const [items, setItems] = useState<SidebarMenuItem[]>(savedItems);
  const [selectedStartPage, setSelectedStartPage] =
    useState<SidebarMenuItemId>(savedStartPage);

  const availableItems = items.filter(item => isItemAvailable(item.id));
  const visibleItems = availableItems.filter(item => !item.hidden);
  const startPage = parseSidebarStartPage(selectedStartPage, availableItems);

  const onToggleItem = (id: SidebarMenuItemId, isVisible: boolean) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, hidden: !isVisible } : item,
      ),
    );
  };

  const onResetToDefault = () => {
    const defaultItems = getDefaultSidebarMenuItems();
    setItems(defaultItems);
    setSelectedStartPage(parseSidebarStartPage(undefined, defaultItems));
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
      setItems(prev =>
        moveSidebarMenuItem(
          prev,
          String(key),
          String(e.target.key),
          e.target.dropPosition,
        ),
      );
    },
  });

  return (
    <Modal name="sidebar-menu" containerProps={{ style: { width: 400 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Sidebar menu')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: 15 }}>
            <Text style={{ color: theme.pageTextLight, lineHeight: 1.5 }}>
              <Trans>
                Choose which pages appear in the sidebar and drag them into the
                order you prefer. Pages you switch off can be found in Settings.
              </Trans>
            </Text>

            <GridList
              aria-label={t('Sidebar menu pages')}
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

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: '8px 10px',
                borderRadius: 6,
                backgroundColor: theme.tableRowBackgroundHover,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text>
                  <Trans>Start page</Trans>
                </Text>
                <Text
                  size="small"
                  style={{
                    color: theme.pageTextSubdued,
                    marginTop: spacing.xxs,
                  }}
                >
                  <Trans>The page Actual shows when it opens.</Trans>
                </Text>
              </View>
              <Select
                value={startPage}
                onChange={setSelectedStartPage}
                options={visibleItems.map(item => [
                  item.id,
                  itemDetails[item.id].title,
                ])}
              />
            </View>

            <ModalButtons
              style={{ marginTop: 0 }}
              leftContent={
                <Button variant="bare" onPress={onResetToDefault}>
                  <Trans>Reset to default</Trans>
                </Button>
              }
            >
              <Button style={{ marginRight: 10 }} onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  saveMenu(
                    items,
                    isItemAvailable(selectedStartPage)
                      ? startPage
                      : selectedStartPage,
                  );
                  state.close();
                }}
              >
                <Trans>Save</Trans>
              </Button>
            </ModalButtons>
          </View>
        </>
      )}
    </Modal>
  );
}
