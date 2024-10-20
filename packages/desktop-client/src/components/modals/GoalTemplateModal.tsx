import { Heading } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { theme } from '../../style';
import { Link } from '../common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { TableHeader, Row, Field } from '../table';

export function GoalTemplateModal() {
  const { t } = useTranslation();
  return (
    <Modal name="goal-templates" containerProps={{ style: { width: 1000 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Goal Templates')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Heading level={3}>{t('Weekly')}</Heading>
          <View>
            <TableHeader>
              <Field width="flex">
                <Trans>Syntax</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                {t('#template $10 repeat every week starting 2025-01-03')}
              </Field>
              <Field width="flex">{t('$10 a week')}</Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                {t(
                  '#template $10 repeat every week starting 2025-01-03 up to $80',
                )}
              </Field>
              <Field width="flex">
                {t('$10 a week, up to a maximum of $80')}
              </Field>
            </Row>

            <Heading level={3}>{t('Monthly')}</Heading>
            <TableHeader>
              <Field width="flex">
                <Trans>Syntax</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">{t('#template $50')}</Field>
              <Field width="flex">{t('$50 each month')}</Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">{t('#template up to $150')}</Field>
              <Field width="flex">
                {t('Up to $150 each month, and remove extra funds over $150')}
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">{t('#template up to $150 hold')}</Field>
              <Field width="flex">
                {t('Up to $150 each month, but retain any funds over $150')}
              </Field>
            </Row>

            <Heading level={3}>{t('Longer Term')}</Heading>
            <TableHeader>
              <Field width="flex">
                <Trans>Syntax</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                {t('#template $500 by 2025-03 repeat every 6 months')}
              </Field>
              <Field width="flex">
                {t(
                  'Break down large, less-frequent expenses into manageable monthly expenses',
                )}
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                {t('#template $500 by 2025-03 repeat every year')}
              </Field>
              <Field width="flex">
                {t(
                  'Break down large, less-frequent expenses into manageable monthly expenses',
                )}
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                {t('#template $500 by 2025-03 repeat every 2 years')}
              </Field>
              <Field width="flex">
                {t(
                  'Break down large, less-frequent expenses into manageable monthly expenses',
                )}
              </Field>
            </Row>

            <Heading level={3}>{t('Schedules')}</Heading>
            <TableHeader>
              <Field width="flex">
                <Trans>Syntax</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                {t('#template schedule SCHEDULE_NAME')}
              </Field>
              <Field width="flex">
                {t('Fund upcoming scheduled transactions over time')}
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                {t('#template schedule full SCHEDULE_NAME')}
              </Field>
              <Field width="flex">
                {t('Fund upcoming scheduled transaction only on needed month')}
              </Field>
            </Row>

            <Heading level={3}>{t('Goals')}</Heading>
            <TableHeader>
              <Field width="flex">
                <Trans>Syntax</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">{t('#goal 1000')}</Field>
              <Field width="flex">
                {t('Set a long-term goal instead of a monthly goal')}
              </Field>
            </Row>
            <div
              style={{
                textAlign: 'right',
                fontSize: '1em',
                color: theme.pageTextLight,
                marginTop: 3,
              }}
            >
              <Text>
                {t('See')}{' '}
                <Link
                  variant="external"
                  linkColor="muted"
                  to="https://actualbudget.org/docs/experimental/goal-templates"
                >
                  {t('Goal Templates')}
                </Link>{' '}
                {t('for more information.')}
              </Text>
            </div>
          </View>
        </>
      )}
    </Modal>
  );
}
