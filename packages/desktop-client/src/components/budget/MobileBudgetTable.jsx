import React, { memo, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import memoizeOne from 'memoize-one';

import { rolloverBudget, reportBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';

import useFeatureFlag from '../../hooks/useFeatureFlag';
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
import { Page } from '../Page';
import PullToRefresh from '../responsive/PullToRefresh';
import CellValue from '../spreadsheet/CellValue';
import NamespaceContext from '../spreadsheet/NamespaceContext';
import useFormat from '../spreadsheet/useFormat';
import useSheetValue from '../spreadsheet/useSheetValue';
import { Tooltip, useTooltip } from '../tooltips';
import { AmountInput } from '../util/AmountInput';
// import {
//   AmountAccessoryContext,
//   MathOperations
// } from '../mobile/AmountInput';

// import { DragDrop, Draggable, Droppable, DragDropHighlight } from './dragdrop';
import BalanceWithCarryover from './BalanceWithCarryover';
import { ListItem, ROW_HEIGHT } from './MobileTable';
import ReportBudgetBalanceTooltip from './report/BalanceTooltip';
import RolloverBudgetBalanceTooltip from './rollover/BalanceTooltip';
import { makeAmountGrey } from './util';

function ToBudget({ toBudget, onClick }) {
  const amount = useSheetValue(toBudget);
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
        <Label
          title="PROJECTED SAVINGS"
          style={{
            ...styles.underlinedText,
            color: theme.formInputText,
            textAlign: 'left',
            fontSize: 9,
          }}
        />
      ) : (
        <Label
          title={isNegative ? 'OVERSPENT' : 'SAVED'}
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
  textStyle,
  categoryId,
  month,
  onBudgetAction,
  onEdit,
  isEditing,
}) {
  const sheetValue = useSheetValue(binding);

  function updateBudgetAmount(amount) {
    onBudgetAction?.(month, 'budget-amount', {
      category: categoryId,
      amount,
    });
  }

  function onAmountClick(e) {
    onEdit?.(categoryId);
  }

  return (
    <View style={style}>
      <AmountInput
        value={sheetValue}
        zeroSign="+"
        style={{
          ...(!isEditing && { display: 'none' }),
          height: ROW_HEIGHT,
          transform: 'translateX(6px)',
        }}
        focused={isEditing}
        textStyle={{ ...styles.smallText, ...textStyle }}
        onUpdate={updateBudgetAmount}
        onBlur={() => onEdit?.(null)}
      />
      <View
        role="button"
        style={{
          ...(isEditing && { display: 'none' }),
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
  type,
  category,
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
  const opacity = blank ? 0 : 1;
  const showEditables = editMode || isEditing;

  const [categoryName, setCategoryName] = useState(category.name);
  const [isHidden, setIsHidden] = useState(category.hidden);

  const tooltip = useTooltip();
  const balanceTooltip = useTooltip();

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

  const onSubmit = () => {
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

  const onMenuSelect = type => {
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

  const listItemRef = useRef();
  const inputRef = useRef();

  const _onBudgetAction = (monthIndex, action, arg) => {
    onBudgetAction?.(
      monthUtils.getMonthFromIndex(monthUtils.getYear(month), monthIndex),
      action,
      arg,
    );
  };

  const content = (
    <ListItem
      style={{
        backgroundColor: isEditingBudget
          ? theme.tableTextEditing
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
                aria-label="Menu"
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
              carryover={carryover}
              balance={balance}
              goal={goal}
              budgeted={budgeted}
              balanceStyle={{
                ...styles.smallText,
                ...styles.underlinedText,
              }}
            />
            {balanceTooltip.isOpen &&
              (type === 'report' ? (
                <ReportBudgetBalanceTooltip
                  offset={5}
                  categoryId={category.id}
                  tooltip={balanceTooltip}
                  monthIndex={monthUtils.getMonthIndex(month)}
                  onBudgetAction={_onBudgetAction}
                  onClose={() => {
                    onOpenBudgetActionMenu?.(null);
                  }}
                />
              ) : (
                <RolloverBudgetBalanceTooltip
                  offset={5}
                  categoryId={category.id}
                  tooltip={balanceTooltip}
                  monthIndex={monthUtils.getMonthIndex(month)}
                  onBudgetAction={_onBudgetAction}
                  onClose={() => {
                    onOpenBudgetActionMenu?.(null);
                  }}
                />
              ))}
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
  budgeted,
  spent,
  balance,
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
  const opacity = blank ? 0 : 1;
  const showEditables = editMode || isEditing;

  const [groupName, setGroupName] = useState(group.name);
  const [isHidden, setIsHidden] = useState(group.hidden);

  const tooltip = useTooltip();

  useEffect(() => {
    if (!isEditing && tooltip.isOpen) {
      tooltip.close();
    }
  }, [isEditing]);

  const onSubmit = () => {
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

  const onMenuSelect = type => {
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

  const listItemRef = useRef();
  const inputRef = useRef();

  const content = (
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
                aria-label="Menu"
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

const IncomeGroupTotals = memo(function IncomeGroupTotals({
  group,
  budgeted,
  balance,
  style,
  onAddCategory,
  onSave,
  onDelete,
  editMode,
  isEditing,
  onEdit,
}) {
  const [groupName, setGroupName] = useState(group.name);
  const [isHidden, setIsHidden] = useState(group.hidden);
  const showEditables = editMode || isEditing;

  const tooltip = useTooltip();

  useEffect(() => {
    if (!isEditing && tooltip.isOpen) {
      tooltip.close();
    }
  }, [isEditing]);

  const onSubmit = () => {
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

  const onMenuSelect = type => {
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

  const listItemRef = useRef();
  const inputRef = useRef();

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
                aria-label="Menu"
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
      {budgeted && (
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
  budgeted,
  balance,
  month,
  style,
  onSave,
  onDelete,
  editMode,
  isEditing,
  onEdit,
  onBudgetAction,
  isEditingBudget,
  onEditBudget,
}) {
  const [categoryName, setCategoryName] = useState(category.name);
  const [isHidden, setIsHidden] = useState(category.hidden);
  const showEditables = editMode || isEditing;

  const tooltip = useTooltip();

  useEffect(() => {
    if (!isEditing && tooltip.isOpen) {
      tooltip.close();
    }
  }, [isEditing]);

  const onSubmit = () => {
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

  const onMenuSelect = type => {
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

  const listItemRef = useRef();
  const inputRef = useRef();

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
                aria-label="Menu"
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
      {budgeted && (
        <View
          style={{
            ...(showEditables && { display: 'none' }),
            justifyContent: 'center',
            alignItems: 'flex-end',
            width: 90,
            height: ROW_HEIGHT,
          }}
        >
          <BudgetCell
            name="budgeted"
            binding={budgeted}
            style={{
              width: 90,
            }}
            textStyle={{ ...styles.smallText, textAlign: 'right' }}
            categoryId={category.id}
            month={month}
            onBudgetAction={onBudgetAction}
            isEditing={isEditingBudget}
            onEdit={onEditBudget}
          />
          {/* <CellValue
            binding={budget}
            style={{
              ...styles.smallText,
              textAlign: 'right',
            }}
            type="financial"
          /> */}
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
  type,
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
              key={category.id}
              show3Cols={show3Cols}
              type={type}
              index={index}
              category={category}
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
              style={{
                backgroundColor: theme.tableBackground,
              }}
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
  editingBudgetCategoryId,
  onEditCategoryBudget,
  onBudgetAction,
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
          budgeted={
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
                index={index}
                onSave={onSaveCategory}
                onDelete={onDeleteCategory}
                editMode={editMode}
                isEditing={editingCategoryId === category.id}
                onEdit={onEditCategory}
                style={{
                  backgroundColor: theme.tableBackground,
                }}
                onBudgetAction={onBudgetAction}
                isEditingBudget={editingBudgetCategoryId === category.id}
                onEditBudget={onEditCategoryBudget}
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
              type={type}
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
          month={month}
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
          editingBudgetCategoryId={editingBudgetCategoryId}
          onEditCategoryBudget={onEditCategoryBudget}
          onBudgetAction={onBudgetAction}
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
    onShowBudgetSummary,
    // onOpenActionSheet,
    onBudgetAction,
    onRefresh,
    onSwitchBudgetType,
    savePrefs,
    pushModal,
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
  const format = useFormat();

  const mobileShowBudgetedColPref = useSelector(state => {
    return state.prefs?.local?.toggleMobileDisplayPref || true;
  });

  const showHiddenCategories = useSelector(state => {
    return state.prefs?.local?.['budget.showHiddenCategories'] || false;
  });

  const [showBudgetedCol, setShowBudgetedCol] = useState(
    !mobileShowBudgetedColPref &&
      !document.cookie.match(/mobileShowBudgetedColPref=true/),
  );

  function toggleDisplay() {
    setShowBudgetedCol(!showBudgetedCol);
    if (!showBudgetedCol) {
      savePrefs({ mobileShowBudgetedColPref: true });
    }
  }

  const buttonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 'unset',
  };

  const _onSwitchBudgetType = () => {
    pushModal('switch-budget-type', {
      onSwitch: onSwitchBudgetType,
    });
  };

  const onToggleHiddenCategories = () => {
    savePrefs({
      'budget.showHiddenCategories': !showHiddenCategories,
    });
  };

  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month, type)}>
      <Page
        padding={0}
        title={
          <MonthSelector
            month={month}
            monthBounds={monthBounds}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
          />
        }
        headerRightContent={
          !editMode ? (
            <BudgetMenu
              onEditMode={onEditMode}
              onToggleHiddenCategories={onToggleHiddenCategories}
              onSwitchBudgetType={_onSwitchBudgetType}
            />
          ) : (
            <Button
              type="bare"
              hoveredStyle={{
                color: theme.mobileHeaderText,
                background: theme.mobileHeaderTextHover,
              }}
              style={{
                ...styles.noTapHighlight,
                ...styles.text,
                backgroundColor: 'transparent',
                color: theme.mobileHeaderText,
              }}
              onClick={() => onEditMode?.(false)}
            >
              Done
            </Button>
          )
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
            <Label title="BALANCE" style={{ color: theme.formInputText }} />
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
          {!editMode ? (
            // <ScrollView
            //   ref={el => (this.list = el)}
            //   keyboardShouldPersistTaps="always"
            //   refreshControl={refreshControl}
            //   style={{ backgroundColor: colors.n10 }}
            //   automaticallyAdjustContentInsets={false}
            // >
            <View data-testid="budget-table">
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
      </Page>
    </NamespaceContext.Provider>
  );
}

function BudgetMenu({
  onEditMode,
  onToggleHiddenCategories,
  onSwitchBudgetType,
}) {
  const tooltip = useTooltip();
  const isReportBudgetEnabled = useFeatureFlag('reportBudget');

  const onMenuSelect = name => {
    tooltip.close();
    switch (name) {
      case 'edit-mode':
        onEditMode?.(true);
        break;
      case 'toggle-hidden-categories':
        onToggleHiddenCategories?.();
        break;
      case 'switch-budget-type':
        onSwitchBudgetType?.();
        break;
      default:
        throw new Error(`Unrecognized menu option: ${name}`);
    }
  };

  return (
    <>
      <Button
        type="bare"
        style={{
          ...styles.noTapHighlight,
        }}
        hoveredStyle={{
          color: theme.mobileHeaderText,
          background: theme.mobileHeaderTextHover,
        }}
        {...tooltip.getOpenEvents()}
      >
        <DotsHorizontalTriple
          width="20"
          height="20"
          style={{ color: theme.mobileHeaderText }}
        />
      </Button>
      {tooltip.isOpen && (
        <Tooltip
          position="bottom-right"
          width={250}
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
              isReportBudgetEnabled && {
                name: 'switch-budget-type',
                text: 'Switch budget type',
              },
            ]}
          />
        </Tooltip>
      )}
    </>
  );
}

function MonthSelector({ month, monthBounds, onPrevMonth, onNextMonth }) {
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
        <ArrowThinLeft width="15" height="15" style={{ margin: -5 }} />
      </Button>
      <Text
        style={{
          color: theme.mobileHeaderText,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 500,
        }}
      >
        {/* eslint-disable-next-line rulesdir/typography */}
        {monthUtils.format(month, "MMMM ''yy")}
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
        <ArrowThinRight width="15" height="15" style={{ margin: -5 }} />
      </Button>
    </View>
  );
}
