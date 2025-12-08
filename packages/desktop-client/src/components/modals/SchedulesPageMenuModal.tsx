import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';

export function SchedulesPageMenuModal() {
  const { t } = useTranslation();
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal name="schedules-page-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Schedules')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <SchedulesPageMenu
            getItemStyle={() => defaultMenuItemStyle}
            onClose={close}
          />
        </>
      )}
    </Modal>
  );
}

type SchedulesPageMenuProps = {
  getItemStyle?: () => CSSProperties;
  onClose: () => void;
};

function SchedulesPageMenu({ getItemStyle, onClose }: SchedulesPageMenuProps) {
  const { t } = useTranslation();
  const [showCompleted, setShowCompletedPref] = useLocalPref(
    'schedules.showCompleted',
  );

  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'toggle-completed-schedules':
        setShowCompletedPref(!showCompleted);
        break;
      default:
        throw new Error(`Unrecognized menu item: ${name}`);
    }
    onClose();
  };

  return (
    <Menu
      getItemStyle={getItemStyle}
      onMenuSelect={onMenuSelect}
      items={[
        {
          name: 'toggle-completed-schedules',
          text: showCompleted
            ? t('Hide completed schedules')
            : t('Show completed schedules'),
        },
      ]}
    />
  );
}
