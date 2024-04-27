import React, { memo, useRef } from 'react';
import { useDispatch } from 'react-redux';

import memoizeOne from 'memoize-one';

import { collapseModals, pushModal } from 'loot-core/client/actions';
import { rolloverBudget, reportBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';

import { useLocalPref } from '../../../hooks/useLocalPref';
import { useNavigate } from '../../../hooks/useNavigate';
import { SvgLogo } from '../../../icons/logo';
import {
  SvgArrowThinLeft,
  SvgArrowThinRight,
  SvgCheveronDown,
  SvgCheveronRight,
} from '../../../icons/v1';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, styles } from '../../../style';
import { BalanceWithCarryover } from '../../budget/BalanceWithCarryover';
import { makeAmountGrey } from '../../budget/util';
import { Button } from '../../common/Button';
import { Card } from '../../common/Card';
import { Label } from '../../common/Label';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { Page } from '../../Page';
import { CellValue } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { MOBILE_NAV_HEIGHT } from '../MobileNavTabs';
import { PullToRefresh } from '../PullToRefresh';

import { ListItem, ROW_HEIGHT } from './ListItem';

function ToBudget({ toBudget, onClick }) {
  const amount = useSheetValue(toBudget);
  return (
    <Button
      type="bare"
      style={{ flexDirection: 'column', alignItems: 'flex-start' }}
      onClick={onClick}
    >
      <Label
        title={amount < 0 ? 'Overbudgeted' : 'To Budget'}
        style={{
          ...styles.underlinedText,
          color: theme.formInputText,
          flexShrink: 0,
          textAlign: 'left',
        }}
      />
      <CellValue
        binding={toBudget}
        type="financial"
        style={{
          ...styles.smallText,
          fontWeight: '500',
          color: amount < 0 ? theme.errorText : theme.formInputText,
        }}
      />
    </Button>
  );
}

function Saved({ projected, onClick }) {
  const binding = projected
    ? reportBudget.totalBudgetedSaved
    : reportBudget.totalSaved;

  const saved = useSheetValue(binding) || 0;
  const isNegative = saved < 0;

  return (
    <Button
      type="bare"
      style={{
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
      onClick={onClick}
    >
      {projected ? (
        <>
          <Label
            title="Projected"
            style={{
              ...styles.underlinedText,
              color: theme.formInputText,
              textAlign: 'left',
              letterSpacing: 2,
              fontSize: 8,
              marginBottom: 0,
            }}
          />
          <Label
            title="Savings"
            style={{
              ...styles.underlinedText,
              color: theme.formInputText,
              textAlign: 'left',
              letterSpacing: 2,
              fontSize: 8,
            }}
          />
        </>
      ) : (
        <Label
          title={isNegative ? 'Overspent' : 'Saved'}
          style={{
            ...styles.underlinedText,
            color: theme.formInputText,
            textAlign: 'left',
          }}
        />
      )}

      <CellValue
        binding={binding}
        type="financial"
        style={{
          ...styles.smallText,
          fontWeight: '500',
          color: projected
            ? theme.warningText
            : isNegative
              ? theme.errorTextDark
              : theme.formInputText,
        }}
      />
    </Button>
  );
}

function BudgetCell({
  name,
  binding,
  style,
  categoryId,
  month,
  onBudgetAction,
}) {
  const dispatch = useDispatch();
  const [budgetType = 'rollover'] = useLocalPref('budgetType');

  const categoryBudgetMenuModal = `${budgetType}-budget-menu`;

  const onOpenCategoryBudgetMenu = () => {
    dispatch(
      pushModal(categoryBudgetMenuModal, {
        categoryId,
        month,
        onUpdateBudget: amount => {
          onBudgetAction(month, 'budget-amount', {
            category: categoryId,
            amount,
          });
        },
        onCopyLastMonthAverage: () => {
          onBudgetAction(month, 'copy-single-last', {
            category: categoryId,
          });
        },
        onSetMonthsAverage: numberOfMonths => {
          if (
            numberOfMonths !== 3 &&
            numberOfMonths !== 6 &&
            numberOfMonths !== 12
          ) {
            return;
          }

          onBudgetAction(month, `set-single-${numberOfMonths}-avg`, {
            category: categoryId,
          });
        },
        onApplyBudgetTemplate: () => {
          onBudgetAction(month, 'apply-single-category-template', {
            category: categoryId,
          });
        },
      }),
    );
  };

  return (
    <CellValue
      binding={binding}
      type="financial"
      style={{
        textAlign: 'right',
        ...styles.smallText,
        ...style,
        ...styles.underlinedText,
      }}
      getStyle={makeAmountGrey}
      data-testid={name}
      onClick={onOpenCategoryBudgetMenu}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ExpenseGroupPreview({ group, pending, style }) {
  return (
    <Card
      style={{
        marginTop: 7,
        marginBottom: 7,
        opacity: pending ? 1 : 0.4,
      }}
    >
      <ExpenseGroupHeader group={group} blank={true} />

      {group.categories.map((cat, index) => (
        <ExpenseCategory
          key={cat.id}
          category={cat}
          blank={true}
          index={index}
        />
      ))}
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ExpenseCategoryPreview({ name, pending, style }) {
  return (
    <ListItem
      style={{
        flex: 1,
        borderColor: 'transparent',
        borderRadius: 4,
      }}
    >
      <Text style={styles.smallText}>{name}</Text>
    </ListItem>
  );
}

const ExpenseCategory = memo(function ExpenseCategory({
  type,
  category,
  isHidden,
  goal,
  budgeted,
  spent,
  balance,
  carryover,
  index,
  // gestures,
  blank,
  style,
  month,
  onEdit,
  onBudgetAction,
  show3Cols,
  showBudgetedCol,
}) {
  const opacity = blank ? 0 : 1;

  const [budgetType = 'rollover'] = useLocalPref('budgetType');
  const dispatch = useDispatch();

  const onCarryover = carryover => {
    onBudgetAction(month, 'carryover', {
      category: category.id,
      flag: carryover,
    });
    dispatch(collapseModals(`${budgetType}-balance-menu`));
  };

  const catBalance = useSheetValue(
    type === 'rollover'
      ? rolloverBudget.catBalance(category.id)
      : reportBudget.catBalance(category.id),
  );

  const onTransfer = () => {
    dispatch(
      pushModal('transfer', {
        title: category.name,
        month,
        amount: catBalance,
        onSubmit: (amount, toCategoryId) => {
          onBudgetAction(month, 'transfer-category', {
            amount,
            from: category.id,
            to: toCategoryId,
          });
          dispatch(collapseModals(`${budgetType}-balance-menu`));
        },
        showToBeBudgeted: true,
      }),
    );
  };

  const onCover = () => {
    dispatch(
      pushModal('cover', {
        categoryId: category.id,
        month,
        onSubmit: fromCategoryId => {
          onBudgetAction(month, 'cover', {
            to: category.id,
            from: fromCategoryId,
          });
          dispatch(collapseModals(`${budgetType}-balance-menu`));
        },
      }),
    );
  };

  const onOpenBalanceMenu = () => {
    dispatch(
      pushModal(`${budgetType}-balance-menu`, {
        categoryId: category.id,
        month,
        onCarryover,
        ...(budgetType === 'rollover' && { onTransfer, onCover }),
      }),
    );
  };

  const listItemRef = useRef();

  const _onBudgetAction = (monthIndex, action, arg) => {
    onBudgetAction?.(
      monthUtils.getMonthFromIndex(monthUtils.getYear(month), monthIndex),
      action,
      arg,
    );
  };
  const navigate = useNavigate();
  const onShowActivity = () => {
    navigate(`/categories/${category.id}?month=${month}`);
  };

  const content = (
    <ListItem
      style={{
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
        borderTopWidth: index > 0 ? 1 : 0,
        opacity: isHidden ? 0.5 : undefined,
        ...style,
      }}
      data-testid="row"
      innerRef={listItemRef}
    >
      <View role="button" style={{ flex: 1 }}>
        <Text
          style={{
            ...styles.smallText,
            ...styles.underlinedText,
            ...styles.lineClamp(2),
          }}
          onClick={() => onEdit?.(category.id)}
          data-testid="category-name"
        >
          {category.name}
        </Text>
      </View>
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          opacity,
        }}
      >
        <BudgetCell
          name="budgeted"
          binding={budgeted}
          style={{
            width: 90,
            ...(!show3Cols && !showBudgetedCol && { display: 'none' }),
          }}
          categoryId={category.id}
          month={month}
          onBudgetAction={onBudgetAction}
        />
        <View
          style={{
            ...(!show3Cols && showBudgetedCol && { display: 'none' }),
            justifyContent: 'center',
            alignItems: 'flex-end',
            width: 90,
            height: ROW_HEIGHT,
          }}
        >
          <CellValue
            name="spent"
            binding={spent}
            style={{
              ...styles.smallText,
              ...styles.underlinedText,
              textAlign: 'right',
            }}
            getStyle={makeAmountGrey}
            type="financial"
            onClick={onShowActivity}
          />
        </View>
        <View
          style={{
            ...styles.noTapHighlight,
            justifyContent: 'center',
            alignItems: 'flex-end',
            width: 90,
            height: ROW_HEIGHT,
          }}
        >
          <span role="button" onClick={() => onOpenBalanceMenu?.()}>
            <BalanceWithCarryover
              carryover={carryover}
              balance={balance}
              goal={goal}
              budgeted={budgeted}
              balanceStyle={{
                ...styles.smallText,
                ...styles.underlinedText,
              }}
            />
          </span>
        </View>
      </View>
    </ListItem>
  );

  return <View>{content}</View>;

  // <Draggable
  //   id={category.id}
  //   type="category"
  //   preview={({ pending, style }) => (
  //     <BudgetCategoryPreview
  //       name={category.name}
  //       pending={pending}
  //       style={style}
  //     />
  //   )}
  //   gestures={gestures}
  // >
  //   <Droppable
  //     type="category"
  //     getActiveStatus={(x, y, { layout }, { id }) => {
  //       let pos = (y - layout.y) / layout.height;
  //       return pos < 0.5 ? 'top' : 'bottom';
  //     }}
  //     onDrop={(id, type, droppable, status) =>
  //       props.onReorder(id.replace('category:', ''), {
  //         aroundCategory: {
  //           id: category.id,
  //           position: status
  //         }
  //       })
  //     }
  //   >
  //     {() => content}
  //   </Droppable>
  // </Draggable>
});

const ExpenseGroupHeader = memo(function ExpenseGroupHeader({
  group,
  budgeted,
  spent,
  balance,
  editMode,
  onEdit,
  blank,
  show3Cols,
  showBudgetedCol,
  collapsed,
  onToggleCollapse,
}) {
  const opacity = blank ? 0 : 1;
  const listItemRef = useRef();

  const content = (
    <ListItem
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.tableRowHeaderBackground,
        opacity: !!group.hidden ? 0.5 : undefined,
        paddingLeft: 0,
      }}
      data-testid="totals"
      innerRef={listItemRef}
    >
      <View
        role="button"
        style={{
          flex: 1,
          alignItems: 'center',
          flexDirection: 'row',
        }}
      >
        <Button
          type="bare"
          style={{ margin: '0 1px', ...styles.noTapHighlight }}
          activeStyle={{
            backgroundColor: 'transparent',
          }}
          hoveredStyle={{
            backgroundColor: 'transparent',
          }}
          onClick={() => onToggleCollapse?.(group.id)}
        >
          {collapsed ? (
            <SvgCheveronRight width={14} height={14} />
          ) : (
            <SvgCheveronDown width={14} height={14} />
          )}
        </Button>
        <Text
          style={{
            ...styles.smallText,
            ...styles.underlinedText,
            ...styles.lineClamp(2),
            fontWeight: '500',
          }}
          onClick={() => onEdit?.(group.id)}
          data-testid="name"
        >
          {group.name}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          height: ROW_HEIGHT,
          opacity,
        }}
      >
        <View
          style={{
            ...(!show3Cols && !showBudgetedCol && { display: 'none' }),
            width: 90,
            height: ROW_HEIGHT,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <CellValue
            binding={budgeted}
            style={{
              ...styles.smallText,
              fontWeight: '500',
              textAlign: 'right',
            }}
            type="financial"
          />
        </View>
        <View
          style={{
            ...(!show3Cols && showBudgetedCol && { display: 'none' }),
            width: 90,
            height: ROW_HEIGHT,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <CellValue
            binding={spent}
            style={{
              ...styles.smallText,
              fontWeight: '500',
              textAlign: 'right',
            }}
            type="financial"
          />
        </View>
        <View
          style={{
            width: 90,
            height: ROW_HEIGHT,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <CellValue
            binding={balance}
            style={{
              ...styles.smallText,
              fontWeight: '500',
              textAlign: 'right',
            }}
            type="financial"
          />
        </View>
      </View>

      {/* {editMode && (
        <View>
          <Button
            onClick={() => onAddCategory(group.id, group.is_income)}
            style={{ padding: 10 }}
          >
            <Add width={15} height={15} />
          </Button>
        </View>
      )} */}
    </ListItem>
  );

  if (!editMode) {
    return content;
  }

  return content;
  // <Droppable
  //   type="category"
  //   getActiveStatus={(x, y, { layout }, { id }) => {
  //     return 'bottom';
  //   }}
  //   onDrop={(id, type, droppable, status) =>
  //     props.onReorderCategory(id, { inGroup: group.id })
  //   }
  // >
  //   {() => content}
  // </Droppable>
});

const IncomeGroupHeader = memo(function IncomeGroupHeader({
  group,
  budgeted,
  balance,
  onEdit,
  collapsed,
  onToggleCollapse,
}) {
  const listItemRef = useRef();

  return (
    <ListItem
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.tableRowHeaderBackground,
        opacity: !!group.hidden ? 0.5 : undefined,
        paddingLeft: 0,
      }}
      innerRef={listItemRef}
    >
      <View
        role="button"
        style={{
          flex: 1,
          alignItems: 'center',
          flexDirection: 'row',
          height: ROW_HEIGHT,
        }}
      >
        <Button
          type="bare"
          style={{ margin: '0 1px', ...styles.noTapHighlight }}
          activeStyle={{
            backgroundColor: 'transparent',
          }}
          hoveredStyle={{
            backgroundColor: 'transparent',
          }}
          onClick={() => onToggleCollapse?.(group.id)}
        >
          {collapsed ? (
            <SvgCheveronRight width={14} height={14} />
          ) : (
            <SvgCheveronDown width={14} height={14} />
          )}
        </Button>
        <Text
          style={{
            ...styles.smallText,
            ...styles.underlinedText,
            ...styles.lineClamp(2),
            fontWeight: '500',
          }}
          onClick={() => onEdit?.(group.id)}
          data-testid="name"
        >
          {group.name}
        </Text>
      </View>
      {budgeted && (
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'flex-end',
            width: 90,
            height: ROW_HEIGHT,
          }}
        >
          <CellValue
            binding={budgeted}
            style={{
              ...styles.smallText,
              textAlign: 'right',
              fontWeight: '500',
            }}
            type="financial"
          />
        </View>
      )}
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'flex-end',
          width: 90,
          height: ROW_HEIGHT,
        }}
      >
        <CellValue
          binding={balance}
          style={{
            ...styles.smallText,
            textAlign: 'right',
            fontWeight: '500',
          }}
          type="financial"
        />
      </View>
    </ListItem>
  );
});

const IncomeCategory = memo(function IncomeCategory({
  index,
  category,
  budgeted,
  balance,
  month,
  style,
  onEdit,
  onBudgetAction,
}) {
  const listItemRef = useRef();

  return (
    <ListItem
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
        borderTopWidth: index > 0 ? 1 : 0,
        opacity: !!category.hidden ? 0.5 : undefined,
        ...style,
      }}
      innerRef={listItemRef}
    >
      <View
        role="button"
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'flex-start',
          height: ROW_HEIGHT,
        }}
      >
        <Text
          style={{
            ...styles.smallText,
            ...styles.underlinedText,
            ...styles.lineClamp(2),
          }}
          onClick={() => onEdit?.(category.id)}
          data-testid="name"
        >
          {category.name}
        </Text>
      </View>
      {budgeted && (
        <BudgetCell
          name="budgeted"
          binding={budgeted}
          style={{ width: 90 }}
          categoryId={category.id}
          month={month}
          onBudgetAction={onBudgetAction}
        />
      )}
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'flex-end',
          width: 90,
          height: ROW_HEIGHT,
        }}
      >
        <CellValue
          binding={balance}
          style={{
            ...styles.smallText,
            textAlign: 'right',
          }}
          type="financial"
        />
      </View>
    </ListItem>
  );
});

// export function BudgetAccessoryView() {
//   let emitter = useContext(AmountAccessoryContext);

//   return (
//     <View>
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'flex-end',
//           alignItems: 'stretch',
//           backgroundColor: colorsm.tableBackground,
//           padding: 5,
//           height: 45
//         }}
//       >
//         <MathOperations emitter={emitter} />
//         <View style={{ flex: 1 }} />
//         <Button
//           onClick={() => emitter.emit('moveUp')}
//           style={{ marginRight: 5 }}
//           data-testid="up"
//         >
//           <ArrowThinUp width={13} height={13} />
//         </Button>
//         <Button
//           onClick={() => emitter.emit('moveDown')}
//           style={{ marginRight: 5 }}
//           data-testid="down"
//         >
//           <ArrowThinDown width={13} height={13} />
//         </Button>
//         <Button onClick={() => emitter.emit('done')} data-testid="done">
//           Done
//         </Button>
//       </View>
//     </View>
//   );
// }

const ExpenseGroup = memo(function ExpenseGroup({
  type,
  group,
  editMode,
  onEditGroup,
  onEditCategory,
  // gestures,
  month,
  // onReorderCategory,
  // onReorderGroup,
  onAddCategory,
  onBudgetAction,
  showBudgetedCol,
  show3Cols,
  showHiddenCategories,
  collapsed,
  onToggleCollapse,
}) {
  function editable(content) {
    if (!editMode) {
      return content;
    }

    return content;
    // <Draggable
    //   id={group.id}
    //   type="group"
    //   preview={({ pending, style }) => (
    //     <BudgetGroupPreview group={group} pending={pending} style={style} />
    //   )}
    //   gestures={gestures}
    // >
    //   <Droppable
    //     type="group"
    //     getActiveStatus={(x, y, { layout }, { id }) => {
    //       let pos = (y - layout.y) / layout.height;
    //       return pos < 0.5 ? 'top' : 'bottom';
    //     }}
    //     onDrop={(id, type, droppable, status) => {
    //       onReorderGroup(id, group.id, status);
    //     }}
    //   >
    //     {() => content}
    //   </Droppable>
    // </Draggable>
  }

  return editable(
    <Card
      style={{
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      <ExpenseGroupHeader
        group={group}
        showBudgetedCol={showBudgetedCol}
        budgeted={
          type === 'report'
            ? reportBudget.groupBudgeted(group.id)
            : rolloverBudget.groupBudgeted(group.id)
        }
        spent={
          type === 'report'
            ? reportBudget.groupSumAmount(group.id)
            : rolloverBudget.groupSumAmount(group.id)
        }
        balance={
          type === 'report'
            ? reportBudget.groupBalance(group.id)
            : rolloverBudget.groupBalance(group.id)
        }
        show3Cols={show3Cols}
        editMode={editMode}
        onAddCategory={onAddCategory}
        onEdit={onEditGroup}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        // onReorderCategory={onReorderCategory}
      />

      {group.categories
        .filter(
          category => !collapsed && (!category.hidden || showHiddenCategories),
        )
        .map((category, index) => {
          return (
            <ExpenseCategory
              key={category.id}
              index={index}
              show3Cols={show3Cols}
              type={type}
              category={category}
              isHidden={!!category.hidden || group.hidden}
              goal={
                type === 'report'
                  ? reportBudget.catGoal(category.id)
                  : rolloverBudget.catGoal(category.id)
              }
              budgeted={
                type === 'report'
                  ? reportBudget.catBudgeted(category.id)
                  : rolloverBudget.catBudgeted(category.id)
              }
              spent={
                type === 'report'
                  ? reportBudget.catSumAmount(category.id)
                  : rolloverBudget.catSumAmount(category.id)
              }
              balance={
                type === 'report'
                  ? reportBudget.catBalance(category.id)
                  : rolloverBudget.catBalance(category.id)
              }
              carryover={
                type === 'report'
                  ? reportBudget.catCarryover(category.id)
                  : rolloverBudget.catCarryover(category.id)
              }
              style={{
                backgroundColor: theme.tableBackground,
              }}
              showBudgetedCol={showBudgetedCol}
              editMode={editMode}
              onEdit={onEditCategory}
              // gestures={gestures}
              month={month}
              // onReorder={onReorderCategory}
              onBudgetAction={onBudgetAction}
            />
          );
        })}
    </Card>,
  );
});

function IncomeGroup({
  type,
  group,
  month,
  onAddCategory,
  showHiddenCategories,
  editMode,
  onEditGroup,
  onEditCategory,
  onBudgetAction,
  collapsed,
  onToggleCollapse,
}) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: 50,
          marginBottom: 5,
          marginRight: 14,
        }}
      >
        {type === 'report' && <Label title="Budgeted" style={{ width: 90 }} />}
        <Label title="Received" style={{ width: 90 }} />
      </View>

      <Card style={{ marginTop: 0 }}>
        <IncomeGroupHeader
          group={group}
          budgeted={
            type === 'report' ? reportBudget.groupBudgeted(group.id) : null
          }
          balance={
            type === 'report'
              ? reportBudget.groupSumAmount(group.id)
              : rolloverBudget.groupSumAmount(group.id)
          }
          onAddCategory={onAddCategory}
          editMode={editMode}
          onEdit={onEditGroup}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />

        {group.categories
          .filter(
            category =>
              !collapsed && (!category.hidden || showHiddenCategories),
          )
          .map((category, index) => {
            return (
              <IncomeCategory
                key={category.id}
                index={index}
                category={category}
                month={month}
                type={type}
                budgeted={
                  type === 'report'
                    ? reportBudget.catBudgeted(category.id)
                    : null
                }
                balance={
                  type === 'report'
                    ? reportBudget.catSumAmount(category.id)
                    : rolloverBudget.catSumAmount(category.id)
                }
                style={{
                  backgroundColor: theme.tableBackground,
                }}
                editMode={editMode}
                onEdit={onEditCategory}
                onBudgetAction={onBudgetAction}
              />
            );
          })}
      </Card>
    </View>
  );
}

function BudgetGroups({
  type,
  categoryGroups,
  onEditGroup,
  onEditCategory,
  editMode,
  gestures,
  month,
  onSaveCategory,
  onDeleteCategory,
  onAddCategory,
  onReorderCategory,
  onReorderGroup,
  onBudgetAction,
  showBudgetedCol,
  show3Cols,
  showHiddenCategories,
}) {
  const separateGroups = memoizeOne(groups => {
    return {
      incomeGroup: groups.find(group => group.is_income),
      expenseGroups: groups.filter(group => !group.is_income),
    };
  });

  const { incomeGroup, expenseGroups } = separateGroups(categoryGroups);
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');

  const onToggleCollapse = id => {
    setCollapsedGroupIdsPref(
      collapsedGroupIds.includes(id)
        ? collapsedGroupIds.filter(collapsedId => collapsedId !== id)
        : [...collapsedGroupIds, id],
    );
  };

  return (
    <View
      data-testid="budget-groups"
      style={{ flex: '1 0 auto', overflowY: 'auto', paddingBottom: 15 }}
    >
      {expenseGroups
        .filter(group => !group.hidden || showHiddenCategories)
        .map(group => {
          return (
            <ExpenseGroup
              key={group.id}
              type={type}
              group={group}
              showBudgetedCol={showBudgetedCol}
              gestures={gestures}
              month={month}
              editMode={editMode}
              onEditGroup={onEditGroup}
              onEditCategory={onEditCategory}
              onSaveCategory={onSaveCategory}
              onDeleteCategory={onDeleteCategory}
              onAddCategory={onAddCategory}
              onReorderCategory={onReorderCategory}
              onReorderGroup={onReorderGroup}
              onBudgetAction={onBudgetAction}
              show3Cols={show3Cols}
              showHiddenCategories={showHiddenCategories}
              collapsed={collapsedGroupIds.includes(group.id)}
              onToggleCollapse={onToggleCollapse}
            />
          );
        })}

      {incomeGroup && (
        <IncomeGroup
          type={type}
          group={incomeGroup}
          month={month}
          onAddCategory={onAddCategory}
          onSaveCategory={onSaveCategory}
          onDeleteCategory={onDeleteCategory}
          showHiddenCategories={showHiddenCategories}
          editMode={editMode}
          onEditGroup={onEditGroup}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          collapsed={collapsedGroupIds.includes(incomeGroup.id)}
          onToggleCollapse={onToggleCollapse}
        />
      )}
    </View>
  );
}

export function BudgetTable({
  type,
  categoryGroups,
  month,
  monthBounds,
  // editMode,
  onPrevMonth,
  onNextMonth,
  onSaveGroup,
  onDeleteGroup,
  onAddCategory,
  onSaveCategory,
  onDeleteCategory,
  onReorderCategory,
  onReorderGroup,
  onShowBudgetSummary,
  onBudgetAction,
  onRefresh,
  onEditGroup,
  onEditCategory,
  onOpenBudgetPageMenu,
  onOpenBudgetMonthMenu,
}) {
  const { width } = useResponsive();
  const show3Cols = width >= 360;

  // let editMode = false; // neuter editMode -- sorry, not rewriting drag-n-drop right now
  const format = useFormat();

  const [showSpentColumn = false, setShowSpentColumnPref] = useLocalPref(
    'mobile.showSpentColumn',
  );

  const [showHiddenCategories = false] = useLocalPref(
    'budget.showHiddenCategories',
  );

  function toggleDisplay() {
    setShowSpentColumnPref(!showSpentColumn);
  }

  const buttonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 'unset',
  };

  const noBackgroundColorStyle = {
    backgroundColor: 'transparent',
    color: 'white',
  };

  return (
    <Page
      padding={0}
      title={
        <MonthSelector
          month={month}
          monthBounds={monthBounds}
          onOpenMonthMenu={onOpenBudgetMonthMenu}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
        />
      }
      headerLeftContent={
        <Button
          type="bare"
          style={{
            color: theme.mobileHeaderText,
            margin: 10,
          }}
          hoveredStyle={noBackgroundColorStyle}
          activeStyle={noBackgroundColorStyle}
          onClick={() => onOpenBudgetPageMenu?.()}
        >
          <SvgLogo width="20" height="20" />
        </Button>
      }
      style={{ flex: 1 }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexShrink: 0,
          padding: 10,
          paddingRight: 14,
          backgroundColor: theme.tableRowHeaderBackground,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
        }}
      >
        {type === 'report' ? (
          <Saved
            projected={month >= monthUtils.currentMonth()}
            onClick={onShowBudgetSummary}
          />
        ) : (
          <ToBudget
            toBudget={rolloverBudget.toBudget}
            onClick={onShowBudgetSummary}
          />
        )}
        <View style={{ flex: 1 }} />
        {(show3Cols || !showSpentColumn) && (
          <Button
            type="bare"
            disabled={show3Cols}
            onClick={toggleDisplay}
            style={{
              ...buttonStyle,
              padding: '0 8px',
              margin: '0 -8px',
              background:
                !showSpentColumn && !show3Cols
                  ? `linear-gradient(-45deg, ${theme.formInputBackgroundSelection} 8px, transparent 0)`
                  : null,
            }}
          >
            <View
              style={{
                flexBasis: 90,
                width: 90,
                justifyContent: 'center',
                alignItems: 'flex-end',
              }}
            >
              <Label
                title="Budgeted"
                style={{ color: theme.buttonNormalText }}
              />
              <CellValue
                binding={
                  type === 'report'
                    ? reportBudget.totalBudgetedExpense
                    : rolloverBudget.totalBudgeted
                }
                type="financial"
                style={{
                  ...styles.smallText,
                  color: theme.buttonNormalText,
                  textAlign: 'right',
                  fontWeight: '500',
                }}
                formatter={value => {
                  return format(-parseFloat(value || '0'), 'financial');
                }}
              />
            </View>
          </Button>
        )}
        {(show3Cols || showSpentColumn) && (
          <Button
            type="bare"
            disabled={show3Cols}
            onClick={toggleDisplay}
            style={{
              ...buttonStyle,
              background:
                showSpentColumn && !show3Cols
                  ? `linear-gradient(45deg, ${theme.formInputBackgroundSelection} 8px, transparent 0)`
                  : null,
            }}
          >
            <View
              style={{
                width: 90,
                justifyContent: 'center',
                alignItems: 'flex-end',
              }}
            >
              <Label title="Spent" style={{ color: theme.formInputText }} />
              <CellValue
                binding={
                  type === 'report'
                    ? reportBudget.totalSpent
                    : rolloverBudget.totalSpent
                }
                type="financial"
                style={{
                  ...styles.smallText,
                  color: theme.formInputText,
                  textAlign: 'right',
                  fontWeight: '500',
                }}
              />
            </View>
          </Button>
        )}
        <View
          style={{
            width: 90,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <Label title="Balance" style={{ color: theme.formInputText }} />
          <CellValue
            binding={
              type === 'report'
                ? reportBudget.totalLeftover
                : rolloverBudget.totalBalance
            }
            type="financial"
            style={{
              ...styles.smallText,
              color: theme.formInputText,
              textAlign: 'right',
              fontWeight: '500',
            }}
          />
        </View>
      </View>
      <PullToRefresh onRefresh={onRefresh}>
        <View
          data-testid="budget-table"
          style={{
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
        >
          <BudgetGroups
            type={type}
            categoryGroups={categoryGroups}
            showBudgetedCol={!showSpentColumn}
            show3Cols={show3Cols}
            showHiddenCategories={showHiddenCategories}
            month={month}
            // gestures={gestures}
            // editMode={editMode}
            onEditGroup={onEditGroup}
            onEditCategory={onEditCategory}
            onSaveCategory={onSaveCategory}
            onDeleteCategory={onDeleteCategory}
            onAddCategory={onAddCategory}
            onSaveGroup={onSaveGroup}
            onDeleteGroup={onDeleteGroup}
            onReorderCategory={onReorderCategory}
            onReorderGroup={onReorderGroup}
            onBudgetAction={onBudgetAction}
          />
        </View>
      </PullToRefresh>
    </Page>
  );
}

function MonthSelector({
  month,
  monthBounds,
  onOpenMonthMenu,
  onPrevMonth,
  onNextMonth,
}) {
  const prevEnabled = month > monthBounds.start;
  const nextEnabled = month < monthUtils.subMonths(monthBounds.end, 1);

  const arrowButtonStyle = {
    padding: 10,
    margin: 2,
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
      }}
    >
      <Button
        type="bare"
        onClick={prevEnabled && onPrevMonth}
        style={{
          ...styles.noTapHighlight,
          ...arrowButtonStyle,
          opacity: prevEnabled ? 1 : 0.6,
          color: theme.mobileHeaderText,
        }}
        hoveredStyle={{
          color: theme.mobileHeaderText,
          background: theme.mobileHeaderTextHover,
        }}
      >
        <SvgArrowThinLeft width="15" height="15" style={{ margin: -5 }} />
      </Button>
      <Text
        style={{
          color: theme.mobileHeaderText,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 500,
          margin: '0 5px',
          ...styles.underlinedText,
        }}
        onClick={() => onOpenMonthMenu?.(month)}
      >
        {monthUtils.format(month, 'MMMM ‘yy')}
      </Text>
      <Button
        type="bare"
        onClick={nextEnabled && onNextMonth}
        style={{
          ...styles.noTapHighlight,
          ...arrowButtonStyle,
          opacity: nextEnabled ? 1 : 0.6,
          color: theme.mobileHeaderText,
        }}
        hoveredStyle={{
          color: theme.mobileHeaderText,
          background: theme.mobileHeaderTextHover,
        }}
      >
        <SvgArrowThinRight width="15" height="15" style={{ margin: -5 }} />
      </Button>
    </View>
  );
}
