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
import { ListItem, ROW_HEIGHT } from './MobileTable';

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
        flexBasis: '80px',
      }}
    >
      {projected ? (
        <Label
          title="PROJECTED SAVINGS"
          style={{ color: theme.formInputText }}
        />
      ) : (
        <Label
          title={isNegative ? 'OVERSPENT' : 'SAVED'}
          style={{ color: theme.formInputText }}
        />
      )}

      <CellValue
        binding={binding}
        type="financial"
        style={{
          ...styles.smallText,
          fontWeight: '500',
          color: projected
            ? theme.alt2WarningText
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
    <View
      style={style}
      onPointerUp={onAmountClick}
      onPointerDown={e => e.preventDefault()}
    >
      {isEditing ? (
        <AmountInput
          initialValue={sheetValue}
          zeroSign="+"
          style={{
            height: ROW_HEIGHT - 4,
            transform: 'translateX(6px)',
          }}
          focused={isEditing}
          textStyle={{ ...styles.smallText, ...textStyle }}
          onChange={updateBudgetAmount}
          onEdit={onEdit}
          onBlur={() => onEdit?.(null)}
        />
      ) : (
        <View
          style={{
            justifyContent: 'center',
            height: ROW_HEIGHT - 4,
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
            data-testid={name}
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
  onBudgetAction,
  show3Cols,
  showBudgetedCol,
}) {
  let opacity = blank ? 0 : 1;
  let showEditables = editMode || isEditing;

  let [categoryName, setCategoryName] = useState(category.name);
  let [isHidden, setIsHidden] = useState(category.hidden);

  let budgeted = rolloverBudget.catBudgeted(category.id);
  let balance = rolloverBudget.catBalance(category.id);
  let spent = rolloverBudget.catSumAmount(category.id);

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
      {showEditables ? (
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <InputWithContent
            focused={isEditing}
            inputRef={inputRef}
            rightContent={
              <Button
                type="bare"
                style={{ padding: 10 }}
                {...tooltip.getOpenEvents()}
              >
                <DotsHorizontalTriple width={12} height={12} />
              </Button>
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
        </View>
      ) : (
        <View
          role="button"
          onPointerUp={() => onEdit?.(category.id)}
          style={{ flex: 1 }}
        >
          <Text
            style={{
              ...styles.smallText,
              ...styles.underlinedText,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            data-testid="category-name"
          >
            {category.name}
          </Text>
        </View>
      )}
      {!showEditables && (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            opacity,
          }}
        >
          {show3Cols || showBudgetedCol ? (
            <BudgetCell
              name="budgeted"
              binding={budgeted}
              style={{ width: 90 }}
              textStyle={{ ...styles.smallText, textAlign: 'right' }}
              categoryId={category.id}
              month={month}
              onBudgetAction={onBudgetAction}
              isEditing={isEditingBudget}
              onEdit={onEditBudget}
            />
          ) : null}
          {show3Cols || !showBudgetedCol ? (
            <CellValue
              name="spent"
              binding={spent}
              style={{
                ...styles.smallText,
                width: 90,
                textAlign: 'right',
              }}
              type="financial"
            />
          ) : null}
          <CellValue
            name="balance"
            binding={balance}
            style={{
              ...styles.smallText,
              width: 90,
              textAlign: 'right',
            }}
            getStyle={value => value < 0 && { color: theme.errorText }}
            type="financial"
          />
        </View>
      )}
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
      {showEditables ? (
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <InputWithContent
            focused={isEditing}
            inputRef={inputRef}
            rightContent={
              <Button
                type="bare"
                style={{ padding: 10 }}
                {...tooltip.getOpenEvents()}
              >
                <DotsHorizontalTriple width={12} height={12} />
              </Button>
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
        </View>
      ) : (
        <View
          role="button"
          onPointerUp={() => onEdit?.(group.id)}
          style={{ flex: 1 }}
        >
          <Text
            tabIndex={-1}
            style={{
              ...styles.smallText,
              ...styles.underlinedText,
              fontWeight: '500',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            data-testid="name"
          >
            {group.name}
          </Text>
        </View>
      )}
      {!showEditables && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            opacity,
          }}
        >
          {show3Cols || showBudgetedCol ? (
            <CellValue
              binding={rolloverBudget.groupBudgeted(group.id)}
              style={{
                ...styles.smallText,
                width: 90,
                fontWeight: '500',
                textAlign: 'right',
              }}
              type="financial"
            />
          ) : null}
          {show3Cols || !showBudgetedCol ? (
            <CellValue
              binding={rolloverBudget.groupSumAmount(group.id)}
              style={{
                ...styles.smallText,
                width: 90,
                fontWeight: '500',
                textAlign: 'right',
              }}
              type="financial"
            />
          ) : null}
          <CellValue
            binding={rolloverBudget.groupBalance(group.id)}
            style={{
              ...styles.smallText,
              width: 90,
              fontWeight: '500',
              textAlign: 'right',
            }}
            type="financial"
          />
        </View>
      )}

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
  nameTextStyle,
  amountTextStyle,
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
      {showEditables ? (
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <InputWithContent
            focused={isEditing}
            inputRef={inputRef}
            rightContent={
              <Button
                type="bare"
                style={{ padding: 10 }}
                {...tooltip.getOpenEvents()}
              >
                <DotsHorizontalTriple width={12} height={12} />
              </Button>
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
        </View>
      ) : (
        <View role="button" onPointerUp={() => onEdit?.(group.id)}>
          <Text
            tabIndex={-1}
            style={{
              ...styles.smallText,
              ...nameTextStyle,
            }}
            data-testid="name"
          >
            {group.name}
          </Text>
        </View>
      )}
      {!showEditables && budget && (
        <CellValue
          binding={budget}
          style={{
            ...styles.smallText,
            textAlign: 'right',
            ...amountTextStyle,
            flex: 1,
          }}
          type="financial"
        />
      )}
      {!showEditables && (
        <CellValue
          binding={balance}
          style={{
            ...styles.smallText,
            textAlign: 'right',
            ...amountTextStyle,
            flex: 1,
          }}
          type="financial"
        />
      )}
    </ListItem>
  );
});

const IncomeCategory = memo(function IncomeCategory({
  category,
  budget,
  balance,
  style,
  nameTextStyle,
  amountTextStyle,
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
      {showEditables ? (
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <InputWithContent
            focused={isEditing}
            inputRef={inputRef}
            rightContent={
              <Button
                type="bare"
                style={{ padding: 10 }}
                {...tooltip.getOpenEvents()}
              >
                <DotsHorizontalTriple width={12} height={12} />
              </Button>
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
        </View>
      ) : (
        <View role="button" onPointerUp={() => onEdit?.(category.id)}>
          <Text
            tabIndex={-1}
            style={{
              ...styles.smallText,
              ...nameTextStyle,
              ...styles.underlinedText,
            }}
            data-testid="name"
          >
            {category.name}
          </Text>
        </View>
      )}
      {!showEditables && budget && (
        <CellValue
          binding={budget}
          style={{
            ...styles.smallText,
            textAlign: 'right',
            ...amountTextStyle,
            flex: 1,
          }}
          type="financial"
        />
      )}
      {!showEditables && (
        <CellValue
          binding={balance}
          style={{
            ...styles.smallText,
            textAlign: 'right',
            ...amountTextStyle,
            flex: 1,
          }}
          type="financial"
        />
      )}
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
          nameTextStyle={{ fontWeight: '500', ...styles.underlinedText }}
          amountTextStyle={{ fontWeight: '500' }}
          style={{
            backgroundColor: theme.altTableBackground,
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
    savePrefs,
  } = props;

  const [editingGroupId, setEditingGroupId] = useState(null);
  function onEditGroup(id) {
    onEdit('group', id);
  }
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  function onEditCategory(id) {
    onEdit('category', id);
  }
  const [editingBudgetCategoryId, setEditingBudgetCategoryId] = useState(null);
  function onEditCategoryBudget(id) {
    onEdit('category-budget', id);
  }

  function onEdit(type, id) {
    // Do not allow editing if another field is currently being edited.
    // Cancel the currently editing field in that case.
    const editingId =
      editingGroupId || editingCategoryId || editingBudgetCategoryId
        ? null
        : id;
    setEditingGroupId(type === 'group' ? editingId : null);
    setEditingCategoryId(type === 'category' ? editingId : null);
    setEditingBudgetCategoryId(type === 'category-budget' ? editingId : null);
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
            backgroundColor: 'white',
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
                  : !show3Cols
                  ? `linear-gradient(45deg, ${theme.formInputBackgroundSelection} 8px, transparent 0)`
                  : null,
              // 45deg to flip it to the lower left corner
            }}
          >
            {show3Cols || showBudgetedCol ? (
              <View style={{ width: 90, justifyContent: 'center' }}>
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
            ) : null}
            {show3Cols || !showBudgetedCol ? (
              <View
                style={{
                  width: 90,
                  justifyContent: 'center',
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
            ) : null}
          </Button>
          <View
            style={{
              width: 90,
              justifyContent: 'center',
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
        backgroundColor: theme.buttonPrimaryBackground,
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
              color: 'white',
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
            style={{ color: theme.formInputTextReadOnlySelection }}
            width="15"
            height="15"
          />
        </Button>
        <Text
          style={{
            ...styles.mediumText,
            color: theme.formInputTextSelected,
            textAlign: 'center',
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
            style={{ color: theme.formInputTextReadOnlySelection }}
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
          <Button
            type="bare"
            style={{
              backgroundColor: 'transparent',
              paddingLeft: 12,
              paddingRight: 12,
            }}
            {...tooltip.getOpenEvents()}
          >
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
            <DotsHorizontalTriple
              width="20"
              height="20"
              style={{ color: 'white' }}
            />
          </Button>
        ) : (
          <Button
            type="bare"
            style={{
              backgroundColor: 'transparent',
              paddingLeft: 12,
              paddingRight: 12,
              ...styles.mediumText,
              color: 'white',
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
