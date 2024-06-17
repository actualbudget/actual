// @ts-strict-ignore
import { createSelector } from 'reselect';

import { getNumberFormat } from '../shared/util';

import type { State } from './state-types';

const getState = (state: State) => state;

const getPrefsState = createSelector(getState, state => state.prefs);
const getLocalPrefsState = createSelector(getPrefsState, prefs => prefs.local);

export const selectNumberFormat = createSelector(getLocalPrefsState, prefs =>
  getNumberFormat({
    format: prefs.numberFormat,
    hideFraction: prefs.hideFraction,
  }),
);
