import { useMemo, type ComponentProps } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useDashboardPages } from '@desktop-client/hooks/useDashboard';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type MoveWidgetToDashboardModalProps = Extract<
  ModalType,
  { name: 'move-widget-to-dashboard' }
>['options'];

export function MoveWidgetToDashboardModal({
  action,
  onSelect,
}: MoveWidgetToDashboardModalProps) {
  const { t } = useTranslation();
  const { data: dashboard_pages = [] } = useDashboardPages();
  const [searchParams] = useSearchParams();

  const dashboardIdParam = searchParams.get('dashboardId');
  const activeDashboard = useMemo(
    () => dashboard_pages.find(d => d.id === dashboardIdParam) || dashboard_pages[0],
    [dashboard_pages, dashboardIdParam],
  );

  const items: ComponentProps<typeof Menu<string>>['items'] = useMemo(
    () =>
      dashboard_pages
        .filter(d => d.id !== activeDashboard?.id)
        .map(d => ({ name: d.id, text: d.name })),
    [dashboard_pages, activeDashboard],
  );

  const title =
    action === 'copy' ? t('Copy to dashboard') : t('Move to dashboard');

  return (
    <Modal name="move-widget-to-dashboard">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={title}
            rightContent={<ModalCloseButton onPress={close} />}
          />

          <View style={{ lineHeight: 1.5 }}>
            {items.length ? (
              <Menu
                items={items}
                onMenuSelect={item => {
                  onSelect(item);
                  close();
                }}
              />
            ) : (
              <View>
                <Trans>No other dashboard pages available.</Trans>
              </View>
            )}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 15,
              }}
            >
              <Button onPress={close}>
                <Trans>Cancel</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
