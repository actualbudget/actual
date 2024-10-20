import { Heading } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { theme } from '../../style';
import { Link } from '../common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

export function GoalTemplateModal() {
  const { t } = useTranslation();
  return (
    <Modal name="goal-templates">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Goal Templates')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              flexDirection: 'row',
              fontSize: 13,
            }}
          >
            <Text style={{ textAlign: 'left' }}>
              <Heading level={3}>{t('Weekly')}</Heading>

              <table>
                <tr>
                  <th>{t('Syntax')}</th>
                  <th>{t('Description')}</th>
                </tr>
                <tr>
                  <td>
                    <strong>
                      {t('#template $10 repeat every week starting 2025-01-03')}
                    </strong>{' '}
                  </td>
                  <td>{t('$10 a week')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>
                      {t(
                        '#template $10 repeat every week starting 2025-01-03 up to $80',
                      )}
                    </strong>
                  </td>
                  <td>{t('$10 a week, up to a maximum of $80')}</td>
                </tr>
              </table>

              <Heading level={3}>{t('Monthly')}</Heading>
              <table>
                <tr>
                  <th>{t('Syntax')}</th>
                  <th>{t('Description')}</th>
                </tr>
                <tr>
                  <td>
                    <strong>{t('#template $50')}</strong>
                  </td>
                  <td>{t('$50 each month')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('#template up to $150')}</strong>
                  </td>
                  <td>
                    {t(
                      'Up to $150 each month, and remove extra funds over $150',
                    )}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>{t('#template up to $150 hold')}</strong>
                  </td>
                  <td>
                    {t('Up to $150 each month, but retain any funds over $150')}
                  </td>
                </tr>
              </table>

              <Heading level={3}>{t('Longer Term')}</Heading>
              <table>
                <tr>
                  <th>{t('Syntax')}</th>
                  <th>{t('Description')}</th>
                </tr>
                <tr>
                  <td>
                    <strong>
                      {t('#template $500 by 2025-03 repeat every 6 months')}
                    </strong>
                  </td>
                  <td>
                    {t(
                      'Break down large, less-frequent expenses into manageable monthly expenses',
                    )}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>
                      {t('#template $500 by 2025-03 repeat every year')}
                    </strong>
                  </td>
                  <td>
                    {t(
                      'Break down large, less-frequent expenses into manageable monthly expenses',
                    )}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>
                      {t('#template $500 by 2025-03 repeat every 2 years')}
                    </strong>
                  </td>
                  <td>
                    {t(
                      'Break down large, less-frequent expenses into manageable monthly expenses',
                    )}
                  </td>
                </tr>
              </table>

              <Heading level={3}>{t('Schedules')}</Heading>
              <table>
                <tr>
                  <th>{t('Syntax')}</th>
                  <th>{t('Description')}</th>
                </tr>
                <tr>
                  <td>
                    <strong>{t('#template schedule SCHEDULE_NAME')}</strong>
                  </td>
                  <td>{t('Fund upcoming scheduled transactions over time')}</td>
                </tr>
                <tr>
                  <td>
                    <strong>
                      {t('#template schedule full SCHEDULE_NAME')}
                    </strong>
                  </td>
                  <td>
                    {t(
                      'Fund upcoming scheduled transaction only on needed month',
                    )}
                  </td>
                </tr>
              </table>

              <Heading level={3}>{t('Goals')}</Heading>
              <table>
                <tr>
                  <th>{t('Syntax')}</th>
                  <th>{t('Description')}</th>
                </tr>
                <tr>
                  <td>
                    <strong>{t('#goal 1000')}</strong>
                  </td>
                  <td>{t('Set a long-term goal instead of a monthly goal')}</td>
                </tr>
              </table>
              <div
                style={{
                  textAlign: 'right',
                  fontSize: '1em',
                  color: theme.pageTextLight,
                  marginTop: 3,
                }}
              >
                <Text>
                  See{' '}
                  <Link
                    variant="external"
                    linkColor="muted"
                    to="https://actualbudget.org/docs/experimental/goal-templates"
                  >
                    Goal Templates
                  </Link>{' '}
                  for more information.
                </Text>
              </div>
            </Text>
          </View>
        </>
      )}
    </Modal>
  );
}
