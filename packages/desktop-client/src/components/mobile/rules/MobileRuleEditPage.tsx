import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type RuleEntity, type NewRuleEntity } from 'loot-core/types/models';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { RuleEditor } from '@desktop-client/components/rules/RuleEditor';
import { useNavigate } from '@desktop-client/hooks/useNavigate';

export function MobileRuleEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Get rule data from location state
  const rule = location.state?.rule as RuleEntity | NewRuleEntity | undefined;
  const onRuleSaved = location.state?.onRuleSaved as (() => void) | undefined;

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

  const handleSave = async () => {
    // Call the callback if provided
    if (onRuleSaved) {
      onRuleSaved();
    }

    // Navigate back to rules list
    navigate('/rules');
  };

  const handleCancel = () => {
    navigate('/rules');
  };

  const isEditing = Boolean(rule && 'id' in rule && rule.id);
  const pageTitle = isEditing ? t('Edit Rule') : t('Create Rule');

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
      <View
        style={{
          flex: 1,
          backgroundColor: theme.mobilePageBackground,
          overflow: 'hidden',
        }}
      >
        <RuleEditor
          rule={defaultRule}
          onSave={handleSave}
          onCancel={handleCancel}
          showTransactionPreview={false}
          style={{
            flex: 1,
            backgroundColor: theme.mobilePageBackground,
          }}
        />
      </View>
    </Page>
  );
}
