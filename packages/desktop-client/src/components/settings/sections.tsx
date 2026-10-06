import React from 'react';

import { isElectron } from '@actual-app/core/shared/environment';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useLocalPref } from '#hooks/useLocalPref';

import { About, AdvancedAbout } from './About';
import { AuthSettings } from './AuthSettings';
import { Backups } from './Backups';
import { BudgetTypeSettings } from './BudgetTypeSettings';
import { CurrencySettings } from './Currency';
import { EncryptionSettings } from './Encryption';
import {
  ExperimentalFeatures,
  ExperimentalSettingsToggle,
} from './Experimental';
import { ExportBudget } from './Export';
import { FormatSettings } from './Format';
import { LanguageSettings } from './LanguageSettings';
import { RepairTransactions } from './RepairTransactions';
import { ResetCache, ResetSync } from './Reset';
import { ThemeSettings } from './Themes';

// Each section is the set of settings behind one entry in the settings
// navigation. They are also stacked, in this order, to make the single-page
// settings screen used on narrow layouts.

export function GeneralSection() {
  const isCurrencyExperimentalEnabled = useFeatureFlag('currency');

  return (
    <>
      <About />
      <LanguageSettings />
      <BudgetTypeSettings />
      <ThemeSettings />
      <FormatSettings />
      {isCurrencyExperimentalEnabled && <CurrencySettings />}
      <AuthSettings />
      <EncryptionSettings />
      {isElectron() && <Backups />}
      <ExportBudget />
    </>
  );
}

export function ExperimentalSection() {
  const [showExperimental = false] = useLocalPref('settings.showExperimental');

  return showExperimental ? <ExperimentalFeatures /> : null;
}

export function AdvancedSection() {
  return (
    <>
      <AdvancedAbout />
      <ResetCache />
      <ResetSync />
      <RepairTransactions />
      <ExperimentalSettingsToggle />
    </>
  );
}
