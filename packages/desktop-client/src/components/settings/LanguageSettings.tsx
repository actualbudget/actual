import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { type TFunction } from 'i18next';

import { useGlobalPref } from '../../hooks/useGlobalPref';
import { availableLanguages, setI18NextLanguage } from '../../i18n';
import { Link } from '../common/Link';
import { Menu } from '../common/Menu';
import { Select, type SelectOption } from '../common/Select';
import { Text } from '../common/Text';

import { Setting } from './UI';

const languageOptions = (t: TFunction): SelectOption[] =>
  [
    ['', t('System default')] as [string, string],
    Menu.line as typeof Menu.line,
  ].concat(
    availableLanguages.map(lang => [
      lang,
      new Intl.DisplayNames([lang], {
        type: 'language',
      }).of(lang) || lang,
    ]),
  );

export function LanguageSettings() {
  const { t } = useTranslation();
  const [language, setLanguage] = useGlobalPref('language');
  const isEnabled = !!availableLanguages.length;

  return (
    <Setting
      primaryAction={
        <Select
          aria-label={t('Select language')}
          options={languageOptions(t)}
          value={isEnabled ? (language ?? '') : 'not-available'}
          defaultLabel={
            isEnabled ? t('Select language') : t('No languages available')
          }
          onChange={value => {
            setLanguage(value);
            setI18NextLanguage(value);
          }}
          disabled={!isEnabled}
        />
      }
    >
      <Text>
        {isEnabled ? (
          <Trans>
            <strong>Language</strong> is the display language of all text.
            Please note that no warranty is provided for the accuracy or
            completeness of non-English translations. If you encounter a
            translation error, feel free to make a suggestion on{' '}
            <Link
              variant="external"
              to={
                'https://hosted.weblate.org/projects/actualbudget/actual/' +
                (language ?? '')
              }
              linkColor="purple"
            >
              Weblate
            </Link>
            .
          </Trans>
        ) : (
          <Trans>
            <strong>Language</strong> support is not available. Please follow
            the instructions{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/translations"
            >
              here
            </Link>{' '}
            to add missing translation files.
          </Trans>
        )}
      </Text>
    </Setting>
  );
}
