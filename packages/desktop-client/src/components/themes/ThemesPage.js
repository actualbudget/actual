import React from 'react';

import { MonthCountSelector } from '../budget/MonthCountSelector';
import { View } from '../common';
import { Page } from '../Page';

/* 
Want to demo the following components

* background
* title bar
* transaction table
* calendar
* model dialog
* notice/warning/error popups
* tooltip
* notes button and popups
* ...

*/

function noop() {}

export function ThemesPage() {
  return (
    // Page has Background
    <Page title="Payees">
      <View backgroundColor="red">Generic view</View>
      <MonthCountSelector maxMonths={3} onChange={() => noop()} />
    </Page>
  );
}
