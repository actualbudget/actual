import React, { memo, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import memoizeOne from 'memoize-one';

import { rolloverBudget, reportBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';

import ArrowThinLeft from '../../icons/v1/ArrowThinLeft';
import ArrowThinRight from '../../icons/v1/ArrowThinRight';
import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';
import { useResponsive } from '../../ResponsiveProvider';
import { theme, styles } from '../../style';
import Button from '../common/Button';
import Card from '../common/Card';
import InputWithContent from '../common/InputWithContent';
import Label from '../common/Label';
import Menu from '../common/Menu';
import Text from '../common/Text';
import View from '../common/View';
import PullToRefresh from '../responsive/PullToRefresh';
import { useServerURL } from '../ServerContext';
import CellValue from '../spreadsheet/CellValue';
import NamespaceContext from '../spreadsheet/NamespaceContext';
import useFormat from '../spreadsheet/useFormat';
import useSheetValue from '../spreadsheet/useSheetValue';
import { SyncButton } from '../Titlebar';
import { Tooltip, useTooltip } from '../tooltips';
import { AmountInput } from '../util/AmountInput';
// import {
//   AmountAccessoryContext,
//   MathOperations
// } from '../mobile/AmountInput';

// import { DragDrop, Draggable, Droppable, DragDropHighlight } from './dragdrop';
import BalanceWithCarryover from './BalanceWithCarryover';
import { ListItem, ROW_HEIGHT } from './MobileTable';
import BalanceTooltip from './rollover/BalanceTooltip';
import { makeAmountGrey } from './util';

function ToBudget({ toBudget, onClick }) {
  let amount = useSheetValue(toBudget);
  return (
    <Button
      type="bare"
      style={{ flexDirection: 'column', alignItems: 'flex-start' }}
      onClick={onClick}
    >
      <Label
        title={amount < 0 ? 'OVERBUDGETED' : 'TO BUDGET'}
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

function Saved({ projected }) {
  let binding = projected
    ? reportBudget.totalBudgetedSaved
    : reportBudget.totalSaved;

  let saved = useSheetValue(binding) || 0;
  let isNegative = saved < 0;

  return (
    <View
      style={{
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      {projected ? (
        <Label
          title="PROJECTED SAVINGS"
          style={{ color: theme.formInputText, textAlign: 'left' }}
        />
      ) : (
        <Label
          title={isNegative ? 'OVERSPENT' : 'SAVED'}
          style={{ color: theme.formInputText, textAlign: 'left' }}
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
    </View>
  );
}

function BudgetCell({
  name,
  binding,
  style,
  textStyle,
  categoryId,
  month,
  onBudgetAction,
  onEdit,
  isEditing,
}) {
  let sheetValue = useSheetValue(binding);

  function updateBudgetAmount(amount) {
    onBudgetAction?.(month, 'budget-amount', {
      category: categoryId,
      amount: amount,
    });
  }

  function onAmountClick(e) {
    onEdit?.(categoryId);
  }

  return (
    <View style={style}>
      {isEditing ? (
        <AmountInput
          initialValue={sheetValue}
          zeroSign="+"
          style={{
            height: ROW_HEIGHT,
            transform: 'translateX(6px)',
          }}
          focused={isEditing}
          textStyle={{ ...styles.smallText, ...textStyle }}
          onChange={updateBudgetAmount}
          onBlur={() => onEdit?.(null)}
        />
      ) : (
        <View
          role="button"
          style={{
            justifyContent: 'center',
            alignItems: 'flex-end',
            height: ROW_HEIGHT,
          }}
        >
          <CellValue
            binding={binding}
            type="financial"
            style={{
              ...styles.smallText,
              ...textStyle,
              ...styles.underlinedText,
            }}
            getStyle={makeAmountGrey}
            data-testid={name}
            onPointerUp={onAmountClick}
            onPointerDown={e => e.preventDefault()}
          />
        </View>
      )}
    </View>
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
      <ExpenseGroupTotals group={group} blank={true} />

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
  category,
  index,
  // gestures,
  blank,
  style,
  month,
  editMode,
  isEditing,
  onEdit,
  isEditingBudget,
  onEditBudget,
  onSave,
  onDelete,
  isBudgetActionMenuOpen,
  onOpenBudgetActionMenu,
  onBudgetAction,
  show3Cols,
  showBudgetedCol,
}) {
  let opacity = blank ? 0 : 1;
  let showEditables = editMode || isEditing;

  let [categoryName, setCategoryName] = useState(category.name);
  let [isHidden, setIsHidden] = useState(category.hidden);

  let budgeted = rolloverBudget.catBudgeted(category.id);
  let spent = rolloverBudget.catSumAmount(category.id);

  let tooltip = useTooltip();
  let balanceTooltip = useTooltip();

  useEffect(() => {
    if (isBudgetActionMenuOpen) {
      balanceTooltip.open();
    }
  }, [isBudgetActionMenuOpen, balanceTooltip]);

  useEffect(() => {
    if (!isEditing && tooltip.isOpen) {
      tooltip.close();
    }
  }, [isEditing, tooltip]);

  let onSubmit = () => {
    if (categoryName) {
      onSave?.({
        ...category,
        name: categoryName,
      });
    } else {
      setCategoryName(category.name);
    }
    onEdit?.(null);
  };

  let onMenuSelect = type => {
    onEdit?.(null);
    switch (type) {
      case 'toggle-visibility':
        setIsHidden(!isHidden);
        onSave?.({
          ...category,
          hidden: !isHidden,
        });
        break;
      case 'delete':
        onDelete?.(category.id);
        break;
      default:
        throw new Error(`Unrecognized category menu type: ${type}`);
    }
  };

  let listItemRef = useRef();
  let inputRef = useRef();

  let content = (
    <ListItem
      style={{
        backgroundColor: isEditingBudget
          ? theme.altTableTextEditing
          : 'transparent',
        borderBottomWidth: 0,
        borderTopWidth: index > 0 ? 1 : 0,
        opacity: isHidden ? 0.5 : undefined,
        ...style,
      }}
      data-testid="row"
      innerRef={listItemRef}
    >
      <View
        style={{
          ...(!showEditables && { display: 'none' }),
          flexDirection: 'row',
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: ROW_HEIGHT,
        }}
      >
        <InputWithContent
          focused={isEditing}
          inputRef={inputRef}
          rightContent={
            <>
              <Button
                type="bare"
                style={{ padding: 10 }}
                {...tooltip.getOpenEvents()}
              >
                <DotsHorizontalTriple width={12} height={12} />
              </Button>
              {tooltip.isOpen && (
                <Tooltip
                  position="bottom-stretch"
                  offset={1}
                  style={{ padding: 0 }}
                  onClose={() => {
                    tooltip.close();
                    inputRef.current?.focus();
                  }}
                >
                  <Menu
                    onMenuSelect={onMenuSelect}
                    items={[
                      {
                        name: 'toggle-visibility',
                        text: isHidden ? 'Show' : 'Hide',
                      },
                      {
                        name: 'delete',
                        text: 'Delete',
                      },
                    ]}
                  />
                </Tooltip>
              )}
            </>
          }
          style={{ width: '100%' }}
          placeholder="Category Name"
          value={categoryName}
          onUpdate={setCategoryName}
          onEnter={onSubmit}
          onBlur={e => {
            if (!listItemRef.current?.contains(e.relatedTarget)) {
              onSubmit();
            }
          }}
        />
      </View>
      <View
        role="button"
        style={{ ...(showEditables && { display: 'none' }), flex: 1 }}
      >
        <Text
          style={{
            ...styles.smallText,
            ...styles.underlinedText,
            ...styles.lineClamp(2),
          }}
          onPointerUp={() => onEdit?.(category.id)}
          data-testid="category-name"
        >
          {category.name}
        </Text>
      </View>
      <View
        style={{
          ...(showEditables && { display: 'none' }),
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
            ...(!show3Cols && !showBudgetedCol && { display: 'none' }),
            width: 90,
          }}
          textStyle={{ ...styles.smallText, textAlign: 'right' }}
          categoryId={category.id}
          month={month}
          onBudgetAction={onBudgetAction}
          isEditing={isEditingBudget}
          onEdit={onEditBudget}
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
              textAlign: 'right',
            }}
            getStyle={makeAmountGrey}
            type="financial"
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
          <span
            role="button"
            onPointerUp={() => onOpenBudgetActionMenu?.(category.id)}
            onPointerDown={e => e.preventDefault()}
          >
            <BalanceWithCarryover
              carryover={rolloverBudget.catCarryover(category.id)}
              balance={rolloverBudget.catBalance(category.id)}
              balanceStyle={{
                ...styles.smallText,
                ...styles.underlinedText,
              }}
            />
            {balanceTooltip.isOpen && (
              <BalanceTooltip
                offset={5}
                categoryId={category.id}
                tooltip={balanceTooltip}
                monthIndex={monthUtils.getMonthIndex(month)}
                onBudgetAction={(monthIndex, action, arg) => {
                  onBudgetAction?.(
                    monthUtils.getMonthFromIndex(
                      monthUtils.getYear(month),
                      monthIndex,
                    ),
                    action,
                    arg,
                  );
                }}
                onClose={() => {
                  onOpenBudgetActionMenu?.(null);
                }}
              />
            )}
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

const ExpenseGroupTotals = memo(function ExpenseGroupTotals({
  group,
  editMode,
  isEditing,
  onEdit,
  blank,
  onAddCategory,
  onSave,
  onDelete,
  show3Cols,
  showBudgetedCol,
}) {
  let opacity = blank ? 0 : 1;
  let showEditables = editMode || isEditing;

  let [groupName, setGroupName] = useState(group.name);
  let [isHidden, setIsHidden] = useState(group.hidden);

  let tooltip = useTooltip();

  useEffect(() => {
    if (!isEditing && tooltip.isOpen) {
      tooltip.close();
    }
  }, [isEditing]);

  let onSubmit = () => {
    if (groupName) {
      onSave?.({
        ...group,
        name: groupName,
      });
    } else {
      setGroupName(group.name);
    }
    onEdit?.(null);
  };

  let onMenuSelect = type => {
    onEdit?.(null);
    switch (type) {
      case 'add-category':
        onAddCategory?.(group.id, group.is_income);
        break;
      case 'toggle-visibility':
        setIsHidden(!isHidden);
        onSave?.({
          ...group,
          hidden: !isHidden,
        });
        break;
      case 'delete':
        onDelete?.(group.id);
        break;
      default:
        throw new Error(`Unrecognized group menu type: ${type}`);
    }
  };

  let listItemRef = useRef();
  let inputRef = useRef();

  let content = (
    <ListItem
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.tableRowHeaderBackground,
        opacity: isHidden ? 0.5 : undefined,
      }}
      data-testid="totals"
      innerRef={listItemRef}
    >
      <View
        style={{
          ...(!showEditables && { display: 'none' }),
          flexDirection: 'row',
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: ROW_HEIGHT,
        }}
      >
        <InputWithContent
          focused={isEditing}
          inputRef={inputRef}
          rightContent={
            <>
              <Button
                type="bare"
                style={{ padding: 10 }}
                {...tooltip.getOpenEvents()}
              >
                <DotsHorizontalTriple width={12} height={12} />
              </Button>
              {tooltip.isOpen && (
                <Tooltip
                  position="bottom-stretch"
                  offset={1}
                  style={{ padding: 0 }}
                  onClose={() => {
                    tooltip.close();
                    inputRef.current?.focus();
                  }}
                >
                  <Menu
                    onMenuSelect={onMenuSelect}
                    items={[
                      {
                        name: 'add-category',
                        text: 'Add category',
                      },
                      {
                        name: 'toggle-visibility',
                        text: isHidden ? 'Show' : 'Hide',
                      },
                      {
                        name: 'delete',
                        text: 'Delete',
                      },
                    ]}
                  />
                </Tooltip>
              )}
            </>
          }
          style={{ width: '100%' }}
          placeholder="Category Group Name"
          value={groupName}
          onUpdate={setGroupName}
          onEnter={onSubmit}
          onBlur={e => {
            if (!listItemRef.current?.contains(e.relatedTarget)) {
              onSubmit();
            }
          }}
        />
      </View>
      <View
        role="button"
        style={{ ...(showEditables && { display: 'none' }), flex: 1 }}
      >
        <Text
          tabIndex={-1}
          style={{
            ...styles.smallText,
            ...styles.underlinedText,
            ...styles.lineClamp(2),
            fontWeight: '500',
          }}
          onPointerUp={() => onEdit?.(group.id)}
          data-testid="name"
        >
          {group.name}
        </Text>
      </View>
      <View
        style={{
          ...(showEditables && { display: 'none' }),
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
            binding={rolloverBudget.groupBudgeted(group.id)}
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
            binding={rolloverBudget.groupSumAmount(group.id)}
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
            binding={rolloverBudget.groupBalance(group.id)}
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

const IncomeGroupTotals = memo(function IncomeGroupTotals({
  group,
  budget,
  balance,
  style,
  onAddCategory,
  onSave,
  onDelete,
  editMode,
  isEditing,
  onEdit,
}) {
  let [groupName, setGroupName] = useState(group.name);
  let [isHidden, setIsHidden] = useState(group.hidden);
  let showEditables = editMode || isEditing;

  let tooltip = useTooltip();

  useEffect(() => {
    if (!isEditing && tooltip.isOpen) {
      tooltip.close();
    }
  }, [isEditing]);

  let onSubmit = () => {
    if (groupName) {
      onSave?.({
        ...group,
        name: groupName,
      });
    } else {
      setGroupName(group.name);
    }
    onEdit?.(null);
  };

  let onMenuSelect = type => {
    onEdit?.(null);
    switch (type) {
      case 'add-category':
        onAddCategory?.(group.id, group.is_income);
        break;
      case 'toggle-visibility':
        setIsHidden(!isHidden);
        onSave?.({
          ...group,
          hidden: !isHidden,
        });
        break;
      case 'delete':
        onDelete?.(group.id);
        break;
      default:
        throw new Error(`Unrecognized group menu type: ${type}`);
    }
  };

  let listItemRef = useRef();
  let inputRef = useRef();

  return (
    <ListItem
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: theme.tableRowHeaderBackground,
        opacity: isHidden ? 0.5 : undefined,
        ...style,
      }}
      innerRef={listItemRef}
    >
      <View
        style={{
          ...(!showEditables && { display: 'none' }),
          flexDirection: 'row',
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: ROW_HEIGHT,
        }}
      >
        <InputWithContent
          focused={isEditing}
          inputRef={inputRef}
          rightContent={
            <>
              <Button
                type="bare"
                style={{ padding: 10 }}
                {...tooltip.getOpenEvents()}
              >
                <DotsHorizontalTriple width={12} height={12} />
              </Button>
              {tooltip.isOpen && (
                <Tooltip
                  position="bottom-stretch"
                  offset={1}
                  style={{ padding: 0 }}
                  onClose={() => {
                    tooltip.close();
                    inputRef.current?.focus();
                  }}
                >
                  <Menu
                    onMenuSelect={onMenuSelect}
                    items={[
                      {
                        name: 'add-category',
                        text: 'Add category',
                      },
                      {
                        name: 'toggle-visibility',
                        text: isHidden ? 'Show' : 'Hide',
                      },
                      {
                        name: 'delete',
                        text: 'Delete',
                      },
                    ]}
                  />
                </Tooltip>
              )}
            </>
          }
          style={{ width: '100%' }}
          placeholder="Category Group Name"
          value={groupName}
          onUpdate={setGroupName}
          onEnter={onSubmit}
          onBlur={e => {
            if (!listItemRef.current?.contains(e.relatedTarget)) {
              onSubmit();
            }
          }}
        />
      </View>
      <View
        role="button"
        style={{
          ...(showEditables && { display: 'none' }),
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
            fontWeight: '500',
          }}
          onPointerUp={() => onEdit?.(group.id)}
          data-testid="name"
        >
          {group.name}
        </Text>
      </View>
      {budget && (
        <View
          style={{
            ...(showEditables && { display: 'none' }),
            justifyContent: 'center',
            alignItems: 'flex-end',
            width: 90,
            height: ROW_HEIGHT,
          }}
        >
          <CellValue
            binding={budget}
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
          ...(showEditables && { display: 'none' }),
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
  category,
  budget,
  balance,
  style,
  onSave,
  onDelete,
  editMode,
  isEditing,
  onEdit,
}) {
  let [categoryName, setCategoryName] = useState(category.name);
  let [isHidden, setIsHidden] = useState(category.hidden);
  let showEditables = editMode || isEditing;

  let tooltip = useTooltip();

  useEffect(() => {
    if (!isEditing && tooltip.isOpen) {
      tooltip.close();
    }
  }, [isEditing]);

  let onSubmit = () => {
    if (categoryName) {
      onSave?.({
        ...category,
        name: categoryName,
      });
    } else {
      setCategoryName(category.name);
    }
    onEdit?.(null);
  };

  let onMenuSelect = type => {
    onEdit?.(null);
    switch (type) {
      case 'toggle-visibility':
        setIsHidden(!isHidden);
        onSave?.({
          ...category,
          hidden: !isHidden,
        });
        break;
      case 'delete':
        onDelete?.(category.id);
        break;
      default:
        throw new Error(`Unrecognized category menu type: ${type}`);
    }
  };

  let listItemRef = useRef();
  let inputRef = useRef();

  return (
    <ListItem
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'transparent',
        opacity: isHidden ? 0.5 : undefined,
        ...style,
      }}
      innerRef={listItemRef}
    >
      <View
        style={{
          ...(!showEditables && { display: 'none' }),
          flexDirection: 'row',
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: ROW_HEIGHT,
        }}
      >
        <InputWithContent
          focused={isEditing}
          inputRef={inputRef}
          rightContent={
            <>
              <Button
                type="bare"
                style={{ padding: 10 }}
                {...tooltip.getOpenEvents()}
              >
                <DotsHorizontalTriple width={12} height={12} />
              </Button>
              {tooltip.isOpen && (
                <Tooltip
                  position="bottom-stretch"
                  offset={1}
                  style={{ padding: 0 }}
                  onClose={() => {
                    tooltip.close();
                    inputRef.current?.focus();
                  }}
                >
                  <Menu
                    onMenuSelect={onMenuSelect}
                    items={[
                      {
                        name: 'toggle-visibility',
                        text: isHidden ? 'Show' : 'Hide',
                      },
                      {
                        name: 'delete',
                        text: 'Delete',
                      },
                    ]}
                  />
                </Tooltip>
              )}
            </>
          }
          style={{ width: '100%' }}
          placeholder="Category Name"
          value={categoryName}
          onUpdate={setCategoryName}
          onEnter={onSubmit}
          onBlur={e => {
            if (!listItemRef.current?.contains(e.relatedTarget)) {
              onSubmit();
            }
          }}
        />
      </View>
      <View
        role="button"
        style={{
          ...(showEditables && { display: 'none' }),
          flex: 1,
          justifyContent: 'center',
          alignItems: 'flex-start',
          height: ROW_HEIGHT,
        }}
      >
        <Text
          tabIndex={-1}
          style={{
            ...styles.smallText,
            ...styles.underlinedText,
            ...styles.lineClamp(2),
          }}
          onPointerUp={() => onEdit?.(category.id)}
          data-testid="name"
        >
          {category.name}
        </Text>
      </View>
      {budget && (
        <View
          style={{
            ...(showEditables && { display: 'none' }),
            justifyContent: 'center',
            alignItems: 'flex-end',
            width: 90,
            height: ROW_HEIGHT,
          }}
        >
          <CellValue
            binding={budget}
            style={{
              ...styles.smallText,
              textAlign: 'right',
            }}
            type="financial"
          />
        </View>
      )}
      <View
        style={{
          ...(showEditables && { display: 'none' }),
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
  group,
  editMode,
  editingGroupId,
  onEditGroup,
  editingCategoryId,
  onEditCategory,
  editingBudgetCategoryId,
  onEditCategoryBudget,
  openBudgetActionMenuId,
  onOpenBudgetActionMenu,
  // gestures,
  month,
  onSaveCategory,
  onDeleteCategory,
  // onReorderCategory,
  // onReorderGroup,
  onAddCategory,
  onSave,
  onDelete,
  onBudgetAction,
  showBudgetedCol,
  show3Cols,
  showHiddenCategories,
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
        marginTop: 7,
        marginBottom: 7,
      }}
    >
      <ExpenseGroupTotals
        group={group}
        showBudgetedCol={showBudgetedCol}
        budgeted={rolloverBudget.groupBudgeted(group.id)}
        balance={rolloverBudget.groupBalance(group.id)}
        show3Cols={show3Cols}
        editMode={editMode}
        onAddCategory={onAddCategory}
        onSave={onSave}
        onDelete={onDelete}
        isEditing={editingGroupId === group.id}
        onEdit={onEditGroup}
        // onReorderCategory={onReorderCategory}
      />

      {group.categories
        .filter(category => !category.hidden || showHiddenCategories)
        .map((category, index) => {
          const isEditingCategory = editingCategoryId === category.id;
          const isEditingCategoryBudget =
            editingBudgetCategoryId === category.id;
          const isBudgetActionMenuOpen = openBudgetActionMenuId === category.id;
          return (
            <ExpenseCategory
              show3Cols={show3Cols}
              key={category.id}
              index={index}
              category={category}
              showBudgetedCol={showBudgetedCol}
              editMode={editMode}
              isEditing={isEditingCategory}
              onEdit={onEditCategory}
              isEditingBudget={isEditingCategoryBudget}
              onEditBudget={onEditCategoryBudget}
              isBudgetActionMenuOpen={isBudgetActionMenuOpen}
              onOpenBudgetActionMenu={onOpenBudgetActionMenu}
              // gestures={gestures}
              month={month}
              onSave={onSaveCategory}
              onDelete={onDeleteCategory}
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
  onSave,
  onDelete,
  onAddCategory,
  onSaveCategory,
  onDeleteCategory,
  showHiddenCategories,
  editMode,
  editingGroupId,
  onEditGroup,
  editingCategoryId,
  onEditCategory,
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
        {type === 'report' && <Label title="BUDGETED" style={{ width: 90 }} />}
        <Label title="RECEIVED" style={{ width: 90 }} />
      </View>

      <Card style={{ marginTop: 0 }}>
        <IncomeGroupTotals
          group={group}
          budget={
            type === 'report' ? reportBudget.groupBudgeted(group.id) : null
          }
          balance={
            type === 'report'
              ? reportBudget.groupSumAmount(group.id)
              : rolloverBudget.groupSumAmount(group.id)
          }
          style={{
            backgroundColor: theme.tableRowHeaderBackground,
          }}
          onAddCategory={onAddCategory}
          onSave={onSave}
          onDelete={onDelete}
          editMode={editMode}
          isEditing={editingGroupId === group.id}
          onEdit={onEditGroup}
        />

        {group.categories
          .filter(category => !category.hidden || showHiddenCategories)
          .map((category, index) => {
            return (
              <IncomeCategory
                key={category.id}
                category={category}
                type={type}
                budget={
                  type === 'report'
                    ? reportBudget.catBudgeted(category.id)
                    : null
                }
                balance={
                  type === 'report'
                    ? reportBudget.catSumAmount(category.id)
                    : rolloverBudget.catSumAmount(category.id)
                }
                index={index}
                onSave={onSaveCategory}
                onDelete={onDeleteCategory}
                editMode={editMode}
                isEditing={editingCategoryId === category.id}
                onEdit={onEditCategory}
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
  editingGroupId,
  onEditGroup,
  editingCategoryId,
  onEditCategory,
  editingBudgetCategoryId,
  onEditCategoryBudget,
  openBudgetActionMenuId,
  onOpenBudgetActionMenu,
  editMode,
  gestures,
  month,
  onSaveCategory,
  onDeleteCategory,
  onAddCategory,
  onAddGroup,
  onSaveGroup,
  onDeleteGroup,
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
              group={group}
              showBudgetedCol={showBudgetedCol}
              gestures={gestures}
              month={month}
              editMode={editMode}
              editingGroupId={editingGroupId}
              onEditGroup={onEditGroup}
              editingCategoryId={editingCategoryId}
              onEditCategory={onEditCategory}
              editingBudgetCategoryId={editingBudgetCategoryId}
              onEditCategoryBudget={onEditCategoryBudget}
              openBudgetActionMenuId={openBudgetActionMenuId}
              onOpenBudgetActionMenu={onOpenBudgetActionMenu}
              onSaveCategory={onSaveCategory}
              onDeleteCategory={onDeleteCategory}
              onAddCategory={onAddCategory}
              onSave={onSaveGroup}
              onDelete={onDeleteGroup}
              onReorderCategory={onReorderCategory}
              onReorderGroup={onReorderGroup}
              onBudgetAction={onBudgetAction}
              show3Cols={show3Cols}
              showHiddenCategories={showHiddenCategories}
            />
          );
        })}

      <View
        style={{
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
      >
        <Button onPointerUp={onAddGroup} style={{ fontSize: 12, margin: 10 }}>
          Add Group
        </Button>
      </View>

      {incomeGroup && (
        <IncomeGroup
          type={type}
          group={incomeGroup}
          onSave={onSaveGroup}
          onDelete={onDeleteGroup}
          onAddCategory={onAddCategory}
          onSaveCategory={onSaveCategory}
          onDeleteCategory={onDeleteCategory}
          showHiddenCategories={showHiddenCategories}
          editMode={editMode}
          editingGroupId={editingGroupId}
          onEditGroup={onEditGroup}
          editingCategoryId={editingCategoryId}
          onEditCategory={onEditCategory}
        />
      )}
    </View>
  );
}

export function BudgetTable(props) {
  const {
    type,
    categoryGroups,
    month,
    monthBounds,
    editMode,
    // refreshControl,
    onPrevMonth,
    onNextMonth,
    onSaveGroup,
    onDeleteGroup,
    onAddGroup,
    onAddCategory,
    onSaveCategory,
    onDeleteCategory,
    onEditMode,
    onReorderCategory,
    onReorderGroup,
    onShowBudgetDetails,
    // onOpenActionSheet,
    onBudgetAction,
    onRefresh,
    savePrefs,
  } = props;

  const GROUP_EDIT_ACTION = 'group';
  const [editingGroupId, setEditingGroupId] = useState(null);
  function onEditGroup(id) {
    onEdit(GROUP_EDIT_ACTION, id);
  }

  const CATEGORY_EDIT_ACTION = 'category';
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  function onEditCategory(id) {
    onEdit(CATEGORY_EDIT_ACTION, id);
  }

  const CATEGORY_BUDGET_EDIT_ACTION = 'category-budget';
  const [editingBudgetCategoryId, setEditingBudgetCategoryId] = useState(null);
  function onEditCategoryBudget(id) {
    onEdit(CATEGORY_BUDGET_EDIT_ACTION, id);
  }

  const BUDGET_MENU_OPEN_ACTION = 'budget-menu';
  const [openBudgetActionMenuId, setOpenBudgetActionMenuId] = useState(null);
  function onOpenBudgetActionMenu(id) {
    onEdit(BUDGET_MENU_OPEN_ACTION, id);
  }

  function onEdit(action, id) {
    // Do not allow editing if another field is currently being edited.
    // Cancel the currently editing field in that case.
    const currentlyEditing =
      editingGroupId ||
      editingCategoryId ||
      editingBudgetCategoryId ||
      openBudgetActionMenuId;

    setEditingGroupId(
      action === GROUP_EDIT_ACTION && !currentlyEditing ? id : null,
    );
    setEditingCategoryId(
      action === CATEGORY_EDIT_ACTION && !currentlyEditing ? id : null,
    );
    setEditingBudgetCategoryId(
      action === CATEGORY_BUDGET_EDIT_ACTION && !currentlyEditing ? id : null,
    );
    setOpenBudgetActionMenuId(
      action === BUDGET_MENU_OPEN_ACTION && !currentlyEditing ? id : null,
    );
  }

  const { width } = useResponsive();
  const show3Cols = width >= 360;

  // let editMode = false; // neuter editMode -- sorry, not rewriting drag-n-drop right now
  let currentMonth = monthUtils.currentMonth();
  let format = useFormat();

  const mobileShowBudgetedColPref = useSelector(state => {
    return state.prefs?.local?.toggleMobileDisplayPref || true;
  });

  const showHiddenCategories = useSelector(state => {
    return state.prefs?.local?.['budget.showHiddenCategories'] || false;
  });

  let [showBudgetedCol, setShowBudgetedCol] = useState(
    !mobileShowBudgetedColPref &&
      !document.cookie.match(/mobileShowBudgetedColPref=true/),
  );

  function toggleDisplay() {
    setShowBudgetedCol(!showBudgetedCol);
    if (!showBudgetedCol) {
      savePrefs({ mobileShowBudgetedColPref: true });
    }
  }

  let buttonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 'unset',
  };

  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month, type)}>
      <View style={{ flex: 1, overflowY: 'hidden' }} data-testid="budget-table">
        <BudgetHeader
          currentMonth={month}
          toggleDisplay={toggleDisplay}
          monthBounds={monthBounds}
          editMode={editMode}
          onEditMode={onEditMode}
          // onOpenActionSheet={onOpenActionSheet}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          showHiddenCategories={showHiddenCategories}
          savePrefs={savePrefs}
        />
        <View
          style={{
            flexDirection: 'row',
            flex: '0 0 auto',
            padding: 10,
            paddingRight: 14,
            backgroundColor: theme.tableRowHeaderBackground,
            borderBottomWidth: 1,
            borderColor: theme.tableBorder,
          }}
        >
          {type === 'report' ? (
            <Saved projected={month >= currentMonth} />
          ) : (
            <ToBudget
              toBudget={rolloverBudget.toBudget}
              onClick={onShowBudgetDetails}
            />
          )}
          <View style={{ flex: 1 }} />
          {(show3Cols || showBudgetedCol) && (
            <Button
              type="bare"
              disabled={show3Cols}
              onClick={toggleDisplay}
              style={{
                ...buttonStyle,
                padding: '0 8px',
                margin: '0 -8px',
                background:
                  showBudgetedCol && !show3Cols
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
                  title="BUDGETED"
                  style={{ color: theme.buttonNormalText }}
                />
                <CellValue
                  binding={reportBudget.totalBudgetedExpense}
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
          {(show3Cols || !showBudgetedCol) && (
            <Button
              type="bare"
              disabled={show3Cols}
              onClick={toggleDisplay}
              style={{
                ...buttonStyle,
                background:
                  !showBudgetedCol && !show3Cols
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
                <Label title="SPENT" style={{ color: theme.formInputText }} />
                <CellValue
                  binding={rolloverBudget.totalSpent}
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
            <Label title="BALANCE" style={{ color: theme.formInputText }} />
            <CellValue
              binding={rolloverBudget.totalBalance}
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
        <View style={{ overflowY: 'auto' }}>
          <PullToRefresh onRefresh={onRefresh}>
            {!editMode ? (
              // <ScrollView
              //   ref={el => (this.list = el)}
              //   keyboardShouldPersistTaps="always"
              //   refreshControl={refreshControl}
              //   style={{ backgroundColor: colors.n10 }}
              //   automaticallyAdjustContentInsets={false}
              // >
              <View>
                <BudgetGroups
                  type={type}
                  categoryGroups={categoryGroups}
                  showBudgetedCol={showBudgetedCol}
                  show3Cols={show3Cols}
                  showHiddenCategories={showHiddenCategories}
                  // gestures={gestures}
                  month={month}
                  editMode={editMode}
                  editingGroupId={editingGroupId}
                  onEditGroup={onEditGroup}
                  editingCategoryId={editingCategoryId}
                  onEditCategory={onEditCategory}
                  editingBudgetCategoryId={editingBudgetCategoryId}
                  onEditCategoryBudget={onEditCategoryBudget}
                  openBudgetActionMenuId={openBudgetActionMenuId}
                  onOpenBudgetActionMenu={onOpenBudgetActionMenu}
                  onSaveCategory={onSaveCategory}
                  onDeleteCategory={onDeleteCategory}
                  onAddCategory={onAddCategory}
                  onAddGroup={onAddGroup}
                  onSaveGroup={onSaveGroup}
                  onDeleteGroup={onDeleteGroup}
                  onReorderCategory={onReorderCategory}
                  onReorderGroup={onReorderGroup}
                  onBudgetAction={onBudgetAction}
                />
              </View>
            ) : (
              // </ScrollView>
              // <DragDrop>
              //   {({
              //     dragging,
              //     onGestureEvent,
              //     onHandlerStateChange,
              //     scrollRef,
              //     onScroll
              //   }) => (
              <View>
                <BudgetGroups
                  type={type}
                  categoryGroups={categoryGroups}
                  showBudgetedCol={showBudgetedCol}
                  show3Cols={show3Cols}
                  showHiddenCategories={showHiddenCategories}
                  // gestures={gestures}
                  editMode={editMode}
                  editingGroupId={editingGroupId}
                  onEditGroup={onEditGroup}
                  editingCategoryId={editingCategoryId}
                  onEditCategory={onEditCategory}
                  editingBudgetCategoryId={editingBudgetCategoryId}
                  onEditCategoryBudget={onEditCategoryBudget}
                  onSaveCategory={onSaveCategory}
                  onDeleteCategory={onDeleteCategory}
                  onAddCategory={onAddCategory}
                  onAddGroup={onAddGroup}
                  onSaveGroup={onSaveGroup}
                  onDeleteGroup={onDeleteGroup}
                  onReorderCategory={onReorderCategory}
                  onReorderGroup={onReorderGroup}
                  onBudgetAction={onBudgetAction}
                />
              </View>

              // <DragDropHighlight />
              // </DragDrop>
            )}
          </PullToRefresh>
        </View>
      </View>
    </NamespaceContext.Provider>
  );
}

const BUDGET_HEADER_HEIGHT = 50;

function BudgetHeader({
  currentMonth,
  monthBounds,
  onPrevMonth,
  onNextMonth,
  editMode,
  onEditMode,
  showHiddenCategories,
  savePrefs,
}) {
  let serverURL = useServerURL();

  let prevEnabled = currentMonth > monthBounds.start;
  let nextEnabled = currentMonth < monthUtils.subMonths(monthBounds.end, 1);

  let buttonStyle = {
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: 'transparent',
  };

  let toggleHiddenCategories = () => {
    savePrefs({
      'budget.showHiddenCategories': !showHiddenCategories,
    });
  };

  let tooltip = useTooltip();

  let onMenuSelect = name => {
    tooltip.close();
    switch (name) {
      case 'edit-mode':
        onEditMode?.(true);
        break;
      case 'toggle-hidden-categories':
        toggleHiddenCategories();
        break;
      default:
        throw new Error(`Unrecognized menu option: ${name}`);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        flexShrink: 0,
        height: BUDGET_HEADER_HEIGHT,
        backgroundColor: theme.mobileHeaderBackground,
      }}
    >
      <View
        style={{
          flexBasis: '25%',
          justifyContent: 'flex-start',
          flexDirection: 'row',
        }}
      >
        {serverURL && (
          <SyncButton
            isMobile
            style={{
              color: theme.formInputText,
              backgroundColor: 'transparent',
              paddingLeft: 12,
              paddingRight: 12,
            }}
          />
        )}
      </View>
      <View
        style={{
          flexBasis: '50%',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
        }}
      >
        <Button
          type="bare"
          // hitSlop={{ top: 5, bottom: 5, left: 0, right: 30 }}
          onClick={prevEnabled && onPrevMonth}
          style={{
            ...buttonStyle,
            opacity: prevEnabled ? 1 : 0.6,
          }}
        >
          <ArrowThinLeft
            style={{ color: theme.formInputText }}
            width="15"
            height="15"
          />
        </Button>
        <Text
          style={{
            color: theme.formInputText,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 500,
            // zIndex: -1
          }}
        >
          {/* eslint-disable-next-line rulesdir/typography */}
          {monthUtils.format(currentMonth, "MMMM ''yy")}
        </Text>
        <Button
          type="bare"
          onClick={nextEnabled && onNextMonth}
          // hitSlop={{ top: 5, bottom: 5, left: 30, right: 5 }}
          style={{ ...buttonStyle, opacity: nextEnabled ? 1 : 0.6 }}
        >
          <ArrowThinRight
            style={{ color: theme.formInputText }}
            width="15"
            height="15"
          />
        </Button>
      </View>
      <View
        style={{
          flexBasis: '25%',
          justifyContent: 'flex-end',
          flexDirection: 'row',
        }}
      >
        {!editMode ? (
          <>
            <Button
              type="bare"
              style={{
                backgroundColor: 'transparent',
                paddingLeft: 12,
                paddingRight: 12,
              }}
              {...tooltip.getOpenEvents()}
            >
              <DotsHorizontalTriple
                width="20"
                height="20"
                style={{ color: theme.formInputText }}
              />
            </Button>
            {tooltip.isOpen && (
              <Tooltip
                position="bottom-right"
                width={200}
                style={{ padding: 0 }}
                onClose={tooltip.close}
              >
                <Menu
                  onMenuSelect={onMenuSelect}
                  items={[
                    { name: 'edit-mode', text: 'Edit mode' },
                    {
                      name: 'toggle-hidden-categories',
                      text: 'Toggle hidden categories',
                    },
                  ]}
                />
              </Tooltip>
            )}
          </>
        ) : (
          <Button
            type="bare"
            style={{
              backgroundColor: 'transparent',
              paddingLeft: 12,
              paddingRight: 12,
              ...styles.mediumText,
              color: theme.formInputText,
            }}
            onClick={() => onEditMode?.(false)}
          >
            Done
          </Button>
        )}
      </View>
    </View>
  );
}
