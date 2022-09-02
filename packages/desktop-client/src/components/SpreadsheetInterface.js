import React from 'react';

import { View } from 'loot-design/src/components/common';
import Cell from 'loot-design/src/components/spreadsheet/Cell';

function SpreadsheetInterface() {
  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 20 }} />
        <View style={{ flex: 1 }}>1</View>
        <View style={{ flex: 1 }}>2</View>
        <View style={{ flex: 1 }}>3</View>
        <View style={{ flex: 1 }}>4</View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 20 }}>A</View>
        <Cell name="A1" />
        <Cell name="A2" />
        <Cell name="A3" />
        <Cell name="A4" />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 20 }}>B</View>
        <Cell name="B1" />
        <Cell name="B2" />
        <Cell name="B3" />
        <Cell name="B4" />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 20 }}>C</View>
        <Cell name="C1" />
        <Cell name="C2" />
        <Cell name="C3" />
        <Cell name="C4" />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 20 }}>D</View>
        <Cell name="D1" />
        <Cell name="D2" />
        <Cell name="D3" />
        <Cell name="D4" />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 20 }}>E</View>
        <Cell name="E1" />
        <Cell name="E2" />
        <Cell name="E3" />
        <Cell name="E4" />
      </View>
    </View>
  );
}

export default SpreadsheetInterface;
