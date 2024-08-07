import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useActions } from '../../hooks/useActions';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';

export function WelcomeScreen() {
  const { t } = useTranslation();
  const { createBudget, pushModal } = useActions();

  return (
    <View
      style={{
        gap: 10,
        maxWidth: 500,
        fontSize: 15,
        maxHeight: '100vh',
        marginBlock: 20,
      }}
    >
      <Text style={styles.veryLargeText}>{t('Let’s get started!')}</Text>
      <View style={{ overflowY: 'auto' }}>
        <Paragraph>
          <Trans>
            Actual is a personal finance tool that focuses on beautiful design
            and a slick user experience.{' '}
            <strong>Editing your data should be as fast as possible.</strong> On
            top of that, we want to provide powerful tools to allow you to do
            whatever you want with your data.
          </Trans>
        </Paragraph>
        <Paragraph>
          <Trans>
            Currently, Actual implements budgeting based on a{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/budgeting/"
              linkColor="purple"
            >
              monthly envelope system
            </Link>
            .
          </Trans>{' '}
          <Trans>
            Consider taking our{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/tour/"
              linkColor="purple"
            >
              guided tour
            </Link>{' '}
            to help you get your bearings, and check out the rest of the
            documentation while you’re there to learn more about advanced
            topics.
          </Trans>
        </Paragraph>
        <Paragraph style={{ color: theme.pageTextLight }}>
          <Trans>
            Get started by importing an existing budget file from Actual or
            another budgeting app, create a demo budget file, or start fresh
            with an empty budget. You can always create or import another budget
            later.
          </Trans>
        </Paragraph>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexShrink: 0,
        }}
      >
        <Button onPress={() => pushModal('import')}>
          {t('Import my budget')}
        </Button>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <Button onPress={() => createBudget({ testMode: true })}>
            {t('View demo')}
          </Button>
          <Button variant="primary" onPress={() => createBudget()}>
            {t('Start fresh')}
          </Button>
        </View>
      </View>
    </View>
  );
}
