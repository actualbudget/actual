import React, { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { PayeeEntity } from '@actual-app/core/types/models';

import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { InputField } from '#components/mobile/MobileForms';
import { MobilePageHeader, Page } from '#components/Page';
import { useNavigate } from '#hooks/useNavigate';
import { usePayees } from '#hooks/usePayees';
import { useUndo } from '#hooks/useUndo';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

export function MobilePayeeEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const { data: payees = [] } = usePayees();

  const [payee, setPayee] = useState<PayeeEntity | null>(null);
  const [editedPayeeName, setEditedPayeeName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load payee by ID
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      const foundPayee = payees.find(p => p.id === id);
      if (foundPayee) {
        setPayee(foundPayee);
        setEditedPayeeName(foundPayee.name);
        setIsLoading(false);
      } else {
        // Payee not found, navigate back to payees list
        void navigate('/payees');
      }
    }
  }, [id, payees, navigate]);

  const handleCancel = useCallback(() => {
    void navigate(-1);
  }, [navigate]);

  const handleSave = useCallback(async () => {
    if (!payee || !editedPayeeName.trim()) {
      return;
    }

    try {
      await send('payees-batch-change', {
        updated: [{ id: payee.id, name: editedPayeeName.trim() }],
      });
      showUndoNotification({
        message: t('Payee {{oldName}} renamed to {{newName}}', {
          oldName: payee.name,
          newName: editedPayeeName.trim(),
        }),
      });
      void navigate('/payees');
    } catch (error) {
      console.error('Failed to update payee:', error);
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to update payee. Please try again.'),
          },
        }),
      );
    }
  }, [payee, editedPayeeName, dispatch, showUndoNotification, t, navigate]);

  // Show loading state while fetching payee
  if (isLoading) {
    return (
      <Page
        header={
          <MobilePageHeader
            title={t('Loading...')}
            leftContent={<MobileBackButton onPress={handleCancel} />}
          />
        }
        padding={0}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.mobilePageBackground,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text>
            <Trans>Loading payee...</Trans>
          </Text>
        </View>
      </Page>
    );
  }

  return (
    <Page
      header={
        <MobilePageHeader
          title={t('Edit Payee')}
          leftContent={<MobileBackButton onPress={handleCancel} />}
        />
      }
      footer={
        <View
          style={{
            paddingLeft: styles.mobileEditingPadding,
            paddingRight: styles.mobileEditingPadding,
            paddingTop: 10,
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
            backgroundColor: theme.tableHeaderBackground,
            borderTopWidth: 1,
            borderColor: theme.tableBorder,
          }}
        >
          <Button
            variant="primary"
            onPress={handleSave}
            isDisabled={!editedPayeeName.trim()}
            style={{ height: styles.mobileMinHeight }}
          >
            <Trans>Save</Trans>
          </Button>
        </View>
      }
    >
      <View style={{ paddingTop: 20 }}>
        <InputField
          placeholder={t('Payee name')}
          value={editedPayeeName}
          onChangeValue={setEditedPayeeName}
        />
      </View>
    </Page>
  );
}
