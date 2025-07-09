import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { createBudget } from '@desktop-client/budgets/budgetsSlice';
import { Link } from '@desktop-client/components/common/Link';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export function WelcomeScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

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
        <Button
          onPress={() => dispatch(pushModal({ modal: { name: 'import' } }))}
        >
          <Trans>Import my budget</Trans>
        </Button>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <Button onPress={() => dispatch(createBudget({ testMode: true }))}>
            <Trans>View demo</Trans>
          </Button>
          <Button
            variant="primary"
            autoFocus
            onPress={() => dispatch(createBudget({}))}
          >
            <Trans>Start fresh</Trans>
          </Button>
        </View>
      </View>
    </View>
  );
}
