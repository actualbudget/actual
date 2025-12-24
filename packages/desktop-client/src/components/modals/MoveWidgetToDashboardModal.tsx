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
import { useDashboards } from '@desktop-client/hooks/useDashboard';
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
  const { data: dashboards = [] } = useDashboards();
  const [searchParams] = useSearchParams();

  const dashboardIdParam = searchParams.get('dashboardId');
  const activeDashboard = useMemo(
    () => dashboards.find(d => d.id === dashboardIdParam) || dashboards[0],
    [dashboards, dashboardIdParam],
  );

  const items: ComponentProps<typeof Menu>['items'] = useMemo(
    () =>
      dashboards
        .filter(d => d.id !== activeDashboard?.id)
        .map(d => ({ name: d.id, text: d.name })),
    [dashboards, activeDashboard],
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
                  onSelect(item as string);
                  close();
                }}
              />
            ) : (
              <View>
                <Trans>No other dashboards available.</Trans>
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
