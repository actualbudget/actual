import { createSelector } from 'reselect';

import { getNumberFormat } from '../../shared/util';

import { selectState } from './root';

const selectPrefsState = createSelector(selectState, state => state.prefs);
export const selectLocalPrefsState = createSelector(
  selectPrefsState,
  prefs => prefs.local,
);
const selectGlobalPrefsState = createSelector(
  selectPrefsState,
  prefs => prefs.global,
);

export const selectLocalPrefId = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.id,
);

export const selectLocalNumberFormat = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.numberFormat || 'comma-dot',
);

export const selectLocalHideFraction = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.hideFraction || false,
);

export const selectLocalPrefCloudFileId = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.cloudFileId,
);

export const selectLocalPrefGroupId = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.groupId,
);

export const selectLocalPrefBudgetName = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.budgetName,
);

export const selectLocalPrefBudgetType = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.budgetType,
);

export const selectLocalPrefEncryptKeyId = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.encryptKeyId,
);

export const selectLocalPerfDateFormat = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.dateFormat || 'MM/dd/yyyy',
);

export const selectLocalPerfIsPrivacyEnabled = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.isPrivacyEnabled ?? false,
);

export const selectLocalPerfHideMobileMessage = createSelector(
  selectLocalPrefsState,
  prefs => prefs?.hideMobileMessage,
);

export const selectGlobalPrefFloatingSidebar = createSelector(
  selectGlobalPrefsState,
  prefs => prefs?.floatingSidebar,
);

export const selectGlobalPrefTheme = createSelector(
  selectGlobalPrefsState,
  prefs => prefs?.theme,
);

export const selectGlobalPrefMaxMonths = createSelector(
  selectGlobalPrefsState,
  prefs => prefs?.maxMonths,
);

export const selectNumberFormat = createSelector(
  selectLocalNumberFormat,
  selectLocalHideFraction,
  (format, hideFraction) =>
    getNumberFormat({
      format,
      hideFraction,
    }),
);
