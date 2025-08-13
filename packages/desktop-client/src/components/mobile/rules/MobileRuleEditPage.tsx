import React, { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useParams } from 'react-router';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { type RuleEntity, type NewRuleEntity } from 'loot-core/types/models';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { RuleEditor } from '@desktop-client/components/rules/RuleEditor';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

export function MobileRuleEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [rule, setRule] = useState<RuleEntity | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
            navigate('/rules');
          }
        })
        .catch(error => {
          console.error('Failed to load rule:', error);
          // Navigate back to rules list if rule not found
          navigate('/rules');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, navigate]);

  // If no rule is provided, create a new one
  const defaultRule: NewRuleEntity = rule || {
    stage: 'pre',
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
  };

  const handleSave = () => {
    // Navigate back to rules list
    navigate('/rules');
  };

  const handleCancel = () => {
    navigate('/rules');
  };

  const isEditing = Boolean(id && id !== 'new' && rule);
  const pageTitle = isEditing ? t('Edit Rule') : t('Create Rule');

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
        style={{
          paddingTop: 10,
          flex: 1,
          backgroundColor: theme.mobilePageBackground,
        }}
      />
    </Page>
  );
}
