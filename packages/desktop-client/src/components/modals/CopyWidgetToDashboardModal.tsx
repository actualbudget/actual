import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useDashboardPages } from '@desktop-client/hooks/useDashboard';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type CopyWidgetToDashboardModalProps = Extract<
  ModalType,
  { name: 'copy-widget-to-dashboard' }
>['options'];

export function CopyWidgetToDashboardModal({
  onSelect,
}: CopyWidgetToDashboardModalProps) {
  const { t } = useTranslation();
  const { data: dashboard_pages = [] } = useDashboardPages();

  const items: ComponentProps<typeof Menu<string>>['items'] = useMemo(
    () => dashboard_pages.map(d => ({ name: d.id, text: d.name })),
    [dashboard_pages],
  );

  return (
    <Modal name="copy-widget-to-dashboard">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Copy to dashboard')}
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
