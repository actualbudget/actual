import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';

export function CategoryLearning() {
  const { t } = useTranslation();
  const [learnCategories = 'true', setLearnCategories] =
    useSyncedPref('learn-categories');
  const isLearnCategoriesEnabled = String(learnCategories) === 'true';

  return (
    <Modal
      name="payee-category-learning"
      containerProps={{ style: { width: 600 } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Category Learning')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Paragraph>
            <Trans>
              <strong>Category Learning</strong> will automatically determine
              the best category for a transaction and create a rule that sets
              the category for the payee.{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/budgeting/rules/#automatic-rules"
                linkColor="purple"
              >
                Learn more
              </Link>
            </Trans>
          </Paragraph>
          <Paragraph>
            <Trans>
              Disabling Category Learning will not delete any existing rules but
              will prevent new rules from being created automatically on a
              global level.
            </Trans>
          </Paragraph>
          <Button
            onPress={() =>
              setLearnCategories(String(!isLearnCategoriesEnabled))
            }
            variant={isLearnCategoriesEnabled ? 'normal' : 'primary'}
          >
            {isLearnCategoriesEnabled ? (
              <Trans>Disable category learning</Trans>
            ) : (
              <Trans>Enable category learning</Trans>
            )}
          </Button>
        </>
      )}
    </Modal>
  );
}
