import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { Setting } from './UI';

export function LearnCategoriesSettings() {
  const { t } = useTranslation();
  const [learnCategories = 'true', setLearnCategories] =
    useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';
  const [expanded, setExpanded] = useState(false);

  return expanded ? (
    <Setting
      primaryAction={
        <View style={{ flexDirection: 'row', gap: '1em' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <View title={t('Upcoming Length')}>
              <Button
                onPress={() =>
                  setLearnCategories(String(!isLearnCategoriesEnabled))
                }
                variant={isLearnCategoriesEnabled ? 'normal' : 'primary'}
              >
                {isLearnCategoriesEnabled ? (
                  <Trans>Disable Category Learning</Trans>
                ) : (
                  <Trans>Enable Category Learning</Trans>
                )}
              </Button>
            </View>
          </View>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <Text>
          <Trans>
            <strong>Category Learning</strong> will automatically determine the
            best category for a transaction and create a rule that sets the
            category for the payee.
          </Trans>{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/budgeting/rules/#automatic-rules"
            linkColor="purple"
          >
            <Trans>Learn more</Trans>
          </Link>
        </Text>
        <Button
          onPress={() => setExpanded(false)}
          aria-label="Close upcoming length settings"
        >
          <Trans>Close</Trans>
        </Button>
      </View>
    </Setting>
  ) : (
    <View>
      <Button
        aria-label="Edit Category Learning Settings"
        variant="primary"
        onPress={() => setExpanded(true)}
      >
        <Trans>Edit Category Learning Settings</Trans>
      </Button>
    </View>
  );
}
