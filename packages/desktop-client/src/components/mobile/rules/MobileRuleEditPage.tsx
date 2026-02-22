import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import { q } from 'loot-core/shared/query';
import type { NewRuleEntity, RuleEntity } from 'loot-core/types/models';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { RuleEditor } from '@desktop-client/components/rules/RuleEditor';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function MobileRuleEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();

  const [rule, setRule] = useState<RuleEntity | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { schedules = [] } = useSchedules({
    query: useMemo(
      () =>
        rule?.id
          ? q('schedules')
              .filter({ rule: rule.id, completed: false })
              .select('*')
          : q('schedules').filter({ id: null }).select('*'), // Return empty result when no rule
      [rule?.id],
    ),
  });

  // Check if the current rule is linked to a schedule
  const isLinkedToSchedule = schedules.length > 0;

  // Load rule by ID if we're in edit mode
  useEffect(() => {
    if (id && id !== 'new') {
      setIsLoading(true);
      send('rule-get', { id })
        .then(loadedRule => {
          if (loadedRule) {
            setRule(loadedRule);
          } else {
            // Rule not found, navigate back to rules list
            void navigate('/rules');
          }
        })
        .catch(error => {
          console.error('Failed to load rule:', error);
          // Navigate back to rules list if rule not found
          void navigate('/rules');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, navigate]);

  // If no rule is provided, create a new one
  const defaultRule: NewRuleEntity = rule || {
    stage: null,
    conditionsOp: 'and',
    conditions: [
      {
        field: 'payee',
        op: 'is',
        value: '',
        type: 'id',
      },
    ],
    actions: [
      {
        field: 'category',
        op: 'set',
        value: '',
        type: 'id',
      },
    ],
    ...(location.state?.rule || {}),
  };

  const handleSave = () => {
    if (rule?.id) {
      showUndoNotification({
        message: t('Rule saved successfully'),
      });
    }
    // Navigate back to rules list
    void navigate('/rules');
  };

  const handleCancel = () => {
    void navigate(-1);
  };

  const handleDelete = () => {
    // Runtime guard to ensure id exists
    if (!id || id === 'new') {
      throw new Error('Cannot delete rule: invalid id');
    }

    dispatch(
      pushModal({
        modal: {
          name: 'confirm-delete',
          options: {
            message: t('Are you sure you want to delete this rule?'),
            onConfirm: async () => {
              try {
                await send('rule-delete', id);
                showUndoNotification({
                  message: t('Rule deleted successfully'),
                });
                void navigate('/rules');
              } catch (error) {
                console.error('Failed to delete rule:', error);
                dispatch(
                  addNotification({
                    notification: {
                      type: 'error',
                      message: t('Failed to delete rule. Please try again.'),
                    },
                  }),
                );
              }
            },
          },
        },
      }),
    );
  };

  const isEditing = Boolean(id && id !== 'new' && rule);
  const pageTitle = location.state?.rule
    ? t('Rule')
    : isEditing
      ? t('Edit Rule')
      : t('Create Rule');

  // Show loading state while fetching rule
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
            <Trans>Loading rule...</Trans>
          </Text>
        </View>
      </Page>
    );
  }

  return (
    <Page
      header={
        <MobilePageHeader
          title={pageTitle}
          leftContent={<MobileBackButton onPress={handleCancel} />}
        />
      }
      padding={0}
    >
      <RuleEditor
        rule={defaultRule}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={isEditing && !isLinkedToSchedule ? handleDelete : undefined}
        style={{
          paddingTop: 10,
          flex: 1,
          backgroundColor: theme.mobilePageBackground,
        }}
      />
    </Page>
  );
}
