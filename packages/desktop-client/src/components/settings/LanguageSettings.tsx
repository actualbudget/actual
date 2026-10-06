import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import type { SelectOption } from '@actual-app/components/select';
import type { TFunction } from 'i18next';

import { Link } from '#components/common/Link';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { availableLanguages, setI18NextLanguage } from '#i18n';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

const languageDisplayNameOverride: { [key: string]: string } = {
  'pt-BR': 'Português (Brasil)',
};

const languageOptions = (t: TFunction): SelectOption[] =>
  [
    ['', t('System default')] as [string, string],
    Menu.line as typeof Menu.line,
  ].concat(
    availableLanguages.map(lang => [
      lang,
      lang in languageDisplayNameOverride
        ? languageDisplayNameOverride[lang]
        : new Intl.DisplayNames([lang], {
            type: 'language',
          }).of(lang) || lang,
    ]),
  );

export function LanguageSettings() {
  const { t } = useTranslation();
  const [language, setLanguage] = useGlobalPref('language');
  const isEnabled = !!availableLanguages.length;

  return (
    <SettingsGroup title={t('Language')}>
      <SettingsRow
        title={t('Display language')}
        description={
          isEnabled ? (
            <Trans>
              Translations are written by the community and may be incomplete or
              inaccurate. Suggest corrections on{' '}
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
              No translation files are installed.{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/install/build-from-source#translations"
                linkColor="purple"
              >
                Add the missing translation files
              </Link>{' '}
              to choose a language.
            </Trans>
          )
        }
        control={
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
      />
    </SettingsGroup>
  );
}
