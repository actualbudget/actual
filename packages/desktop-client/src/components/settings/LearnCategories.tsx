import React from 'react';
import { useTranslation } from 'react-i18next';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Text } from '../common/Text';

import { Setting } from './UI';

export function LearnCategoriesSettings() {
  const { t } = useTranslation();
  const [learnCategories = 'false', setLearnCategories] =
    useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  return (
    <Setting
      primaryAction={
        <Button
          onPress={() => setLearnCategories(String(!isLearnCategoriesEnabled))}
        >
          {isLearnCategoriesEnabled
            ? t('Disable Category Learning')
            : t('Enable Category Learning')}
        </Button>
      }
    >
      <Text>
        <strong>{t('Category Learning')}</strong>
        {t(
          ' will automatically determine the best category for a transaction and create a rule that sets the category for the payee.',
        )}{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/budgeting/rules/#automatic-rules"
          linkColor="purple"
        >
          {t('Learn more…')}
        </Link>
      </Text>
    </Setting>
  );
}
