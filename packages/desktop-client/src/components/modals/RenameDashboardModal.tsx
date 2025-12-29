import { useRef, useState } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type RenameDashboardModalProps = Extract<
  ModalType,
  { name: 'rename-dashboard' }
>['options'];

export function RenameDashboardModal({
  dashboardId,
  currentName,
}: RenameDashboardModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (close: () => void) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('Name is required'));
      return;
    }

    if (trimmedName === currentName) {
      close();
      return;
    }

    try {
      await send('dashboard-rename', { id: dashboardId, name: trimmedName });
      close();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('Failed to rename dashboard'),
      );
    }
  };

  return (
    <Modal name="rename-dashboard">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Rename Dashboard')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Form
            onSubmit={e => {
              e.preventDefault();
              onSubmit(close);
            }}
          >
            <View style={{ gap: 10 }}>
              <FormField>
                <FormLabel title={t('Dashboard name')} htmlFor="name-field" />
                <InitialFocus>
                  <Input
                    ref={inputRef}
                    id="name-field"
                    value={name}
                    onChangeValue={value => {
                      setName(value);
                      setError(null);
                    }}
                  />
                </InitialFocus>
                {error && (
                  <View style={{ color: styles.colors.r4, fontSize: 13 }}>
                    {error}
                  </View>
                )}
              </FormField>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <Button variant="bare" onPress={close}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button variant="primary" type="submit">
                  <Trans>Rename</Trans>
                </Button>
              </View>
            </View>
          </Form>
        </>
      )}
    </Modal>
  );
}
