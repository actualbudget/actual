import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { TableHeader, Row, Field } from '@desktop-client/components/table';

export function GoalTemplateModal() {
  const { t } = useTranslation();

  return (
    <Modal name="goal-templates" containerProps={{ style: { width: 850 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Goal Templates')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View>
            <TableHeader>
              <Field width="flex">
                <Trans>Weekly Templates</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                #template 10 repeat every week starting 2025-01-03
              </Field>
              <Field width="flex">
                <Trans>$10 a week</Trans>
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                #template 10 repeat every week starting 2025-01-03 up to 80
              </Field>
              <Field width="flex">
                <Trans>$10 a week, up to a maximum of $80</Trans>
              </Field>
            </Row>
            <span>
              <br />
            </span>
            <TableHeader>
              <Field width="flex">
                <Trans>Monthly Templates</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">#template 50</Field>
              <Field width="flex">
                <Trans>$50 each month</Trans>
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">#template up to 150</Field>
              <Field width="flex">
                <Trans>
                  Up to $150 each month, and remove extra funds over $150
                </Trans>
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">#template up to 150 hold</Field>
              <Field width="flex">
                <Trans>
                  Up to $150 each month, but retain any funds over $150
                </Trans>
              </Field>
            </Row>
            <span>
              <br />
            </span>
            <TableHeader>
              <Field width="flex">
                <Trans>Multi-month Templates</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                #template 500 by 2025-03 repeat every 6 months
              </Field>
              <Field width="flex">
                <Trans>
                  Break down less-frequent expenses into monthly expenses
                </Trans>
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                #template 500 by 2025-03 repeat every year
              </Field>
              <Field width="flex">
                <Trans>
                  Break down less-frequent expenses into monthly expenses
                </Trans>
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">
                #template 500 by 2025-03 repeat every 2 years
              </Field>
              <Field width="flex">
                <Trans>
                  Break down less-frequent expenses into monthly expenses
                </Trans>
              </Field>
            </Row>
            <span>
              <br />
            </span>
            <TableHeader>
              <Field width="flex">
                <Trans>Schedule Templates</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">#template schedule SCHEDULE_NAME</Field>
              <Field width="flex">
                <Trans>Fund upcoming scheduled transactions over time</Trans>
              </Field>
            </Row>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">#template schedule full SCHEDULE_NAME</Field>
              <Field width="flex">
                <Trans>
                  Fund upcoming scheduled transaction only on needed month
                </Trans>
              </Field>
            </Row>
            <span>
              <br />
            </span>
            <TableHeader>
              <Field width="flex">
                <Trans>Goal Templates</Trans>
              </Field>
              <Field width="flex">
                <Trans>Description</Trans>
              </Field>
            </TableHeader>
            <Row style={{ backgroundColor: theme.tableBackground }}>
              <Field width="flex">#goal 1000</Field>
              <Field width="flex">
                <Trans>Set a long-term goal instead of a monthly goal</Trans>
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
              <span>
                <br />
              </span>
              <Text>
                <Trans>
                  See{' '}
                  <Link
                    variant="external"
                    linkColor="muted"
                    to="https://actualbudget.org/docs/experimental/goal-templates"
                  >
                    Goal Templates
                  </Link>{' '}
                  for more information.
                </Trans>
              </Text>
            </div>
          </View>
        </>
      )}
    </Modal>
  );
}
