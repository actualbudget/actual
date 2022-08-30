import React from 'react';

/* eslint-disable */

function BudgetSheetHeader({ row }) {
  return (
    <Row style={{ zIndex: 200, backgroundColor: colors.grey1, marginLeft: 20 }}>
      <Cell
        value="A"
        width="flex"
        borderColor={colors.grey2}
        isFirstCell={true}
      />
      <Cell value="B" width="flex" borderColor={colors.grey2} />
      <Cell value="C" width="flex" borderColor={colors.grey2} />
      <Cell value="D" width="flex" borderColor={colors.grey2} />
    </Row>
  );
}

function BudgetSheetRow({ row, editing, onEdit }) {
  const borderColor = colors.grey1;
  const cellA = 'A' + row;
  const cellB = 'B' + row;
  const cellC = 'C' + row;
  const cellD = 'D' + row;
  return (
    <Row collapsed={true}>
      <Cell
        value={row}
        width={20}
        borderColor={colors.grey2}
        isFirstCell={true}
        style={{
          backgroundColor: colors.grey1
        }}
      />
      <SheetCell
        exposed={editing === cellA}
        width="flex"
        name={cellA}
        borderColor={borderColor}
        focused={true}
        onExpose={() => onEdit(cellA)}
        onSave={() => onEdit(null)}
        valueProps={{ name: cellA }}
      />
      <SheetCell
        exposed={editing === cellB}
        onExpose={() => onEdit(cellB)}
        name={cellB}
        width="flex"
        borderColor={borderColor}
        focused={true}
        onSave={() => onEdit(null)}
        valueProps={{ name: cellB }}
      />
      <SheetCell
        exposed={editing === cellC}
        onExpose={() => onEdit(cellC)}
        name={cellC}
        width="flex"
        borderColor={borderColor}
        focused={true}
        onSave={() => onEdit(null)}
        valueProps={{ name: cellC }}
      />
      <SheetCell
        exposed={editing === cellD}
        onExpose={() => onEdit(cellD)}
        name={cellD}
        width="flex"
        borderColor={borderColor}
        focused={true}
        onSave={() => onEdit(null)}
        valueProps={{ name: cellD }}
      />
    </Row>
  );
}

const BudgetSheet = scope(lively => {
  function getInitialState() {
    return { editing: null };
  }

  function onEdit(bag, name) {
    return { editing: name };
  }

  function BudgetSheet({ props: { month }, state: { editing }, updater }) {
    return (
      <Namespace name={monthUtils.sheetForMonth(month)} key={month}>
        <BudgetSheetHeader />
        <BudgetSheetRow row={1} editing={editing} onEdit={updater(onEdit)} />
        <BudgetSheetRow row={2} editing={editing} onEdit={updater(onEdit)} />
        <BudgetSheetRow row={3} editing={editing} onEdit={updater(onEdit)} />
        <BudgetSheetRow row={4} editing={editing} onEdit={updater(onEdit)} />
      </Namespace>
    );
  }

  return lively(BudgetSheet, { getInitialState });
});

function BudgetSheets({
  startMonth,
  numMonths,
  numDisplayedMonths,
  budgetWidth,
  containerRef,
  innerRef,
  onClose
}) {
  return (
    <div
      ref={innerRef}
      style={{
        ...styles.page,
        display: 'flex',
        flex: 1,
        border: 0,
        borderTopWidth: 5,
        borderColor: colors.purple2,
        borderStyle: 'solid',
        backgroundColor: 'white',
        paddingTop: 15,
        height: 250,
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 200
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          margin: 15,
          zIndex: 300
        }}
      >
        <button onClick={onClose}>v</button>
      </View>

      <BudgetScroller
        width={budgetWidth * numDisplayedMonths}
        style={{ marginLeft: 150 }}
        containerRef={containerRef}
      >
        {() => {
          const sheets = [];

          for (let i = 0; i < numMonths; i++) {
            const month = monthUtils.addMonths(startMonth, i);
            sheets.push(
              <View style={{ width: budgetWidth, paddingLeft: 20 }}>
                <View style={{ padding: 15 }}>
                  <BudgetSheet month={month} />
                </View>
              </View>
            );
          }

          return sheets;
        }}
      </BudgetScroller>
    </div>
  );
}
