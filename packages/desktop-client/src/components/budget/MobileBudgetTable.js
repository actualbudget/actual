import React from 'react';
// import {
//   RectButton,
//   PanGestureHandler,
//   NativeViewGestureHandler
// } from 'react-native-gesture-handler';
// import Animated, { Easing } from 'react-native-reanimated';
// import AndroidKeyboardAvoidingView from './AndroidKeyboardAvoidingView';
import { connect } from 'react-redux';

import memoizeOne from 'memoize-one';

import * as actions from 'loot-core/src/client/actions';
import { rolloverBudget, reportBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';
import { amountToInteger, integerToAmount } from 'loot-core/src/shared/util';
import {
  Button,
  Card,
  Label,
  Text,
  View
} from 'loot-design/src/components/common';
import CellValue from 'loot-design/src/components/spreadsheet/CellValue';
import format from 'loot-design/src/components/spreadsheet/format';
import NamespaceContext from 'loot-design/src/components/spreadsheet/NamespaceContext';
import SheetValue from 'loot-design/src/components/spreadsheet/SheetValue';
import useSheetValue from 'loot-design/src/components/spreadsheet/useSheetValue';
import { colors, styles } from 'loot-design/src/style';
import Add from 'loot-design/src/svg/v1/Add';
import ArrowThinLeft from 'loot-design/src/svg/v1/ArrowThinLeft';
import ArrowThinRight from 'loot-design/src/svg/v1/ArrowThinRight';
// import {
//   AmountAccessoryContext,
//   MathOperations
// } from 'loot-design/src/components/mobile/AmountInput';

// import { DragDrop, Draggable, Droppable, DragDropHighlight } from './dragdrop';

import { SyncButton } from '../Titlebar';
import { AmountInput } from '../util/AmountInput';

import { ListItem, ROW_HEIGHT } from './MobileTable';

export function ToBudget({ toBudget, onClick }) {
  return (
    <SheetValue binding={toBudget}>
      {({ value: amount }) => {
        return (
          <Button
            bare
            style={{ flexDirection: 'column', alignItems: 'flex-start' }}
            onClick={onClick}
          >
            <Label
              title={amount < 0 ? 'OVERBUDGETED' : 'TO BUDGET'}
              style={{ color: colors.n1, flexShrink: 0 }}
            />
            <Text
              style={[
                styles.smallText,
                {
                  fontWeight: '500',
                  color: amount < 0 ? colors.r4 : colors.n1
                }
              ]}
            >
              {format(amount, 'financial')}
            </Text>
          </Button>
        );
      }}
    </SheetValue>
  );
}

function Saved({ projected }) {
  let budgetedSaved = useSheetValue(reportBudget.totalBudgetedSaved) || 0;
  let totalSaved = useSheetValue(reportBudget.totalSaved) || 0;
  let saved = projected ? budgetedSaved : totalSaved;
  let isNegative = saved < 0;

  return (
    <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
      {projected ? (
        <Label title="PROJECTED SAVINGS" style={{ color: colors.n1 }} />
      ) : (
        <Label
          title={isNegative ? 'OVERSPENT' : 'SAVED'}
          style={{ color: colors.n1 }}
        />
      )}

      <Text
        style={[
          styles.smallText,
          {
            fontWeight: '500',
            color: projected ? colors.y3 : isNegative ? colors.r4 : colors.n1
          }
        ]}
      >
        {format(saved, 'financial')}
      </Text>
    </View>
  );
}

export class BudgetCell extends React.PureComponent {
  render() {
    const {
      name,
      binding,
      editing,
      style,
      textStyle,
      categoryId,
      month,
      onBudgetAction
    } = this.props;

    return (
      <SheetValue binding={binding}>
        {node => {
          return (
            <View style={style}>
              <AmountInput
                value={integerToAmount(node.value || 0)}
                style={{
                  height: ROW_HEIGHT - 4,
                  transform: 'translateX(6px)',
                  ...(!editing && {
                    opacity: 0,
                    position: 'absolute',
                    top: 0
                  })
                }}
                focused={editing}
                textStyle={[styles.smallText, textStyle]}
                onChange={() => {}} // temporarily disabled for read-only view
                onBlur={value => {
                  onBudgetAction(month, 'budget-amount', {
                    category: categoryId,
                    amount: amountToInteger(value)
                  });
                }}
              />

              <View
                style={{
                  justifyContent: 'center',
                  height: ROW_HEIGHT - 4,
                  ...(editing && { display: 'none' })
                }}
              >
                <Text style={[styles.smallText, textStyle]} data-testid={name}>
                  {format(node.value || 0, 'financial')}
                </Text>
              </View>
            </View>
          );
        }}
      </SheetValue>
    );
  }
}

// eslint-disable-next-line no-unused-vars
function BudgetGroupPreview({ group, pending, style }) {
  //   let opacity = useMemo(() => new Animated.Value(0), []);

  //   useEffect(() => {
  //     Animated.timing(opacity, {
  //       toValue: 1,
  //       duration: 100,
  //       easing: Easing.inOut(Easing.ease)
  //     }).start();
  //   }, []);

  return (
    // <Animated.View
    //   style={[
    //     style,
    //     { opacity },
    //     pending && {
    //       shadowColor: '#000',
    //       shadowOffset: {
    //         width: 0,
    //         height: 3
    //       },
    //       shadowOpacity: 0.45,
    //       shadowRadius: 20,
    //       elevation: 5
    //     }
    //   ]}
    // >
    <Card
      style={{
        marginTop: 7,
        marginBottom: 7,
        opacity: pending ? 1 : 0.4
      }}
    >
      <TotalsRow group={group} blank={true} />

      {group.categories.map((cat, index) => (
        <BudgetCategory category={cat} blank={true} index={index} />
      ))}
    </Card>
    // </Animated.View>
  );
}

// eslint-disable-next-line no-unused-vars
function BudgetCategoryPreview({ name, pending, style }) {
  return (
    // <Animated.View
    //   style={[
    //     style,
    //     { opacity: pending ? 1 : 0.4 },
    //     {
    //       backgroundColor: 'white',
    //       shadowColor: '#000',
    //       shadowOffset: {
    //         width: 0,
    //         height: 2
    //       },
    //       shadowOpacity: 0.25,
    //       shadowRadius: 10,
    //       elevation: 5
    //     }
    //   ]}
    // >
    <ListItem
      style={{
        flex: 1,
        borderColor: 'transparent',
        borderRadius: 4
      }}
    >
      <Text style={styles.smallText}>{name}</Text>
    </ListItem>
    // </Animated.View>
  );
}

export class BudgetCategory extends React.PureComponent {
  constructor(props) {
    super(props);

    let { editMode, blank } = props;
    // this.opacity = new Animated.Value(editMode || blank ? 0 : 1);
    this.opacity = editMode || blank ? 0 : 1;
  }

  //   componentDidUpdate(prevProps) {
  //     if (prevProps.editing !== this.props.editing) {
  //       if (this.props.editing && ACTScrollViewManager) {
  //         ACTScrollViewManager.setFocused(findNodeHandle(this.container));
  //       }
  //     }

  //     if (prevProps.editMode !== this.props.editMode) {
  //       Animated.timing(this.opacity, {
  //         toValue: this.props.editMode ? 0 : 1,
  //         duration: 200,
  //         easing: Easing.inOut(Easing.ease)
  //       }).start();
  //     }
  //   }

  render() {
    let {
      category,
      editing,
      index,
      // gestures,
      // editMode,
      style,
      month,
      // onEdit,
      onBudgetAction
    } = this.props;

    let budgeted = rolloverBudget.catBudgeted(category.id);
    let balance = rolloverBudget.catBalance(category.id);

    let content = (
      <ListItem
        // ref={el => (this.container = el)}
        style={[
          {
            backgroundColor: editing ? colors.p11 : 'transparent',
            borderBottomWidth: 0,
            borderTopWidth: index > 0 ? 1 : 0
          },
          style
        ]}
        data-testid="row"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.smallText}>{category.name}</Text>
        </View>
        {/* <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            opacity: this.opacity
          }}
        > */}
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            opacity: this.opacity
          }}
        >
          <BudgetCell
            name="budgeted"
            binding={budgeted}
            editing={editing}
            style={{ width: 90 }}
            textStyle={[styles.smallText, { textAlign: 'right' }]}
            categoryId={category.id}
            month={month}
            onBudgetAction={onBudgetAction}
          />
          <CellValue
            name="balance"
            binding={balance}
            style={[styles.smallText, { width: 90, textAlign: 'right' }]}
            getStyle={value => value < 0 && { color: colors.r4 }}
            type="financial"
          />
        </View>
        {/* </Animated.View> */}
      </ListItem>
    );

    return <div>{content}</div>;
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
    //       this.props.onReorder(id.replace('category:', ''), {
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
  }
}

export class TotalsRow extends React.PureComponent {
  constructor(props) {
    super(props);

    let { editMode, blank } = props;
    // this.animation = new Animated.Value(editMode || blank ? 0 : 1);
    this.opacity = editMode || blank ? 0 : 1;
  }

  //   componentDidUpdate(prevProps) {
  //     if (prevProps.editMode !== this.props.editMode) {
  //       Animated.timing(this.animation, {
  //         toValue: this.props.editMode ? 0 : 1,
  //         duration: 200,
  //         easing: Easing.inOut(Easing.ease)
  //       }).start();
  //     }
  //   }

  render() {
    let { group, editMode, onAddCategory } = this.props;

    let content = (
      <ListItem
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.n11
        }}
        data-testid="totals"
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.smallText, { fontWeight: '500' }]}
            data-testid="name"
          >
            {group.name}
          </Text>
        </View>
        {/* <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            opacity: this.animation
          }}
        > */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            opacity: this.opacity
          }}
        >
          <CellValue
            binding={rolloverBudget.groupBudgeted(group.id)}
            style={[
              styles.smallText,
              { width: 90, fontWeight: '500', textAlign: 'right' }
            ]}
            type="financial"
          />
          <CellValue
            binding={rolloverBudget.groupBalance(group.id)}
            style={[
              styles.smallText,
              { width: 90, fontWeight: '500', textAlign: 'right' }
            ]}
            type="financial"
          />
        </View>
        {/* </Animated.View> */}

        {editMode && (
          //   <Animated.View
          //     style={{
          //       flexDirection: 'row',
          //       alignItems: 'center',
          //       opacity: this.opacity,
          //       position: 'absolute',
          //       top: 0,
          //       bottom: 0,
          //       right: this.animation.interpolate({
          //         inputRange: [0, 1],
          //         outputRange: [5, -30]
          //       })
          //     }}
          //   >
          <View>
            <Button
              onClick={() => onAddCategory(group.id)}
              style={{ padding: 10 }}
            >
              <Add width={15} height={15} color={colors.n1} />
            </Button>
          </View>
          //   </Animated.View>
        )}
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
    //     this.props.onReorderCategory(id, { inGroup: group.id })
    //   }
    // >
    //   {() => content}
    // </Droppable>
  }
}

export class IncomeCategory extends React.PureComponent {
  render() {
    const { name, budget, balance, style, nameTextStyle, amountTextStyle } =
      this.props;
    return (
      <ListItem
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 10,
            backgroundColor: 'transparent'
          },
          style
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.smallText, nameTextStyle]} data-testid="name">
            {name}
          </Text>
        </View>
        {budget && (
          <CellValue
            binding={budget}
            style={[
              styles.smallText,
              { width: 90, textAlign: 'right' },
              amountTextStyle
            ]}
            type="financial"
          />
        )}
        <CellValue
          binding={balance}
          style={[
            styles.smallText,
            { width: 90, textAlign: 'right' },
            amountTextStyle
          ]}
          type="financial"
        />
      </ListItem>
    );
  }
}

// export function BudgetAccessoryView() {
//   let emitter = useContext(AmountAccessoryContext);

//   return (
//     <View>
//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'flex-end',
//           alignItems: 'stretch',
//           backgroundColor: colors.n10,
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

export class BudgetGroup extends React.PureComponent {
  render() {
    const {
      group,
      // editingId,
      editMode,
      gestures,
      month,
      onEditCategory,
      onReorderCategory,
      // onReorderGroup,
      onAddCategory,
      onBudgetAction
    } = this.props;

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
          marginBottom: 7
        }}
      >
        <TotalsRow
          group={group}
          budgeted={rolloverBudget.groupBudgeted(group.id)}
          balance={rolloverBudget.groupBalance(group.id)}
          editMode={editMode}
          onAddCategory={onAddCategory}
          onReorderCategory={onReorderCategory}
        />

        {group.categories.map((category, index) => {
          // const editing = editingId === category.id;
          return (
            <BudgetCategory
              key={category.id}
              index={index}
              category={category}
              editing={undefined} //editing}
              editMode={editMode}
              gestures={gestures}
              month={month}
              onEdit={onEditCategory}
              onReorder={onReorderCategory}
              onBudgetAction={onBudgetAction}
            />
          );
        })}
      </Card>
    );
  }
}

export class IncomeBudgetGroup extends React.Component {
  render() {
    const { type, group } = this.props;
    return (
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: 50,
            marginBottom: 5,
            marginRight: 14
          }}
        >
          {type === 'report' && (
            <Label title="BUDGETED" style={{ width: 90 }} />
          )}
          <Label title="RECEIVED" style={{ width: 90 }} />
        </View>

        <Card style={{ marginTop: 0 }}>
          <IncomeCategory
            name="Income"
            budget={
              type === 'report' ? reportBudget.groupBudgeted(group.id) : null
            }
            balance={
              type === 'report'
                ? reportBudget.groupSumAmount(group.id)
                : rolloverBudget.groupSumAmount(group.id)
            }
            nameTextStyle={{ fontWeight: '500' }}
            amountTextStyle={{ fontWeight: '500' }}
            style={{ backgroundColor: colors.n11 }}
          />

          {group.categories.map((category, index) => {
            return (
              <IncomeCategory
                key={category.id}
                type={type}
                name={category.name}
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
              />
            );
          })}
        </Card>
      </View>
    );
  }
}

export class BudgetGroups extends React.Component {
  getGroups = memoizeOne(groups => {
    return {
      incomeGroup: groups.find(group => group.is_income),
      expenseGroups: groups.filter(group => !group.is_income)
    };
  });

  render() {
    const {
      type,
      categoryGroups,
      editingId,
      // editMode,
      gestures,
      month,
      onEditCategory,
      onAddCategory,
      onReorderCategory,
      onReorderGroup,
      onBudgetAction
    } = this.props;
    const { incomeGroup, expenseGroups } = this.getGroups(categoryGroups);

    return (
      <View
        data-testid="budget-groups"
        style={{ flex: '1 0 auto', overflowY: 'auto', paddingBottom: 15 }}
      >
        {expenseGroups.map(group => {
          return (
            <BudgetGroup
              key={group.id}
              group={group}
              editingId={editingId}
              editMode={undefined} //editMode}
              gestures={gestures}
              month={month}
              onEditCategory={onEditCategory}
              onAddCategory={onAddCategory}
              onReorderCategory={onReorderCategory}
              onReorderGroup={onReorderGroup}
              onBudgetAction={onBudgetAction}
            />
          );
        })}

        {incomeGroup && <IncomeBudgetGroup type={type} group={incomeGroup} />}
      </View>
    );
  }
}

export class BudgetTable extends React.Component {
  // static contextType = AmountAccessoryContext;
  state = { editingCategory: null };

  // constructor(props) {
  //   super(props);
  //   this.gestures = {
  //     scroll: React.createRef(null),
  //     pan: React.createRef(null),
  //     rows: []
  //   };
  // }

  // componentDidMount() {
  // if (ACTScrollViewManager) {
  //   ACTScrollViewManager.activate(
  //     (this.list.getNode
  //       ? this.list.getNode()
  //       : this.list
  //     ).getScrollableNode()
  //   );
  // }

  // const removeFocus = this.props.navigation.addListener('focus', () => {
  //   if (ACTScrollViewManager) {
  //     ACTScrollViewManager.activate(
  //       (this.list.getNode
  //         ? this.list.getNode()
  //         : this.list
  //       ).getScrollableNode()
  //     );
  //   }
  // });

  // const keyboardWillHide = e => {
  //   if (ACTScrollViewManager) {
  //     ACTScrollViewManager.setFocused(-1);
  //   }
  //   this.onEditCategory(null);
  // };

  // let keyListener = Keyboard.addListener(
  //   Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
  //   keyboardWillHide
  // );

  //   let emitter = this.context;
  //   emitter.on('done', this.onKeyboardDone);
  //   emitter.on('moveUp', this.onMoveUp);
  //   emitter.on('moveDown', this.onMoveDown);

  //   this.cleanup = () => {
  //     //   removeFocus();
  //     //   keyListener.remove();

  //     emitter.off('done', this.onKeyboardDone);
  //     emitter.off('moveUp', this.onMoveUp);
  //     emitter.off('moveDown', this.onMoveDown);
  //   };
  // }

  // componentWillUnmount() {
  //   this.cleanup();
  // }

  onEditCategory = id => {
    this.setState({ editingCategory: id });
  };

  //   onKeyboardDone = () => {
  //     Keyboard.dismiss();

  //     if (Platform.isReactNativeWeb) {
  //       // TODO: If we are running tests, they can't rely on the
  //       // keyboard events, so manually reset the state here. Hopefully
  //       // we can find a better solution for this in the future.
  //       this.onEditCategory(null);
  //     }
  //   };

  // onMoveUp = () => {
  //   const { categories } = this.props;
  //   const { editingCategory } = this.state;
  //   const expenseCategories = categories.filter(cat => !cat.is_income);

  //   const idx = expenseCategories.findIndex(cat => editingCategory === cat.id);
  //   if (idx - 1 >= 0) {
  //     this.onEditCategory(expenseCategories[idx - 1].id);
  //   }
  // };

  // onMoveDown = () => {
  //   const { categories } = this.props;
  //   const { editingCategory } = this.state;
  //   const expenseCategories = categories.filter(cat => !cat.is_income);

  //   const idx = expenseCategories.findIndex(cat => editingCategory === cat.id);
  //   if (idx + 1 < expenseCategories.length) {
  //     this.onEditCategory(expenseCategories[idx + 1].id);
  //   }
  // };

  render() {
    const {
      type,
      categoryGroups,
      month,
      monthBounds,
      editMode,
      // refreshControl,
      onPrevMonth,
      onNextMonth,
      onAddCategory,
      onReorderCategory,
      onReorderGroup,
      onShowBudgetDetails,
      onOpenActionSheet,
      onBudgetAction
    } = this.props;
    // let editMode = false; // neuter editMode -- sorry, not rewriting drag-n-drop right now
    let { editingCategory } = this.state;
    let currentMonth = monthUtils.currentMonth();

    return (
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month, type)}>
        <View
          style={{ flex: 1, overflowY: 'hidden' }}
          data-testid="budget-table"
        >
          <BudgetHeader
            currentMonth={month}
            monthBounds={monthBounds}
            editMode={editMode}
            onDone={() => this.props.onEditMode(false)}
            onOpenActionSheet={onOpenActionSheet}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
          />
          <View
            style={{
              flexDirection: 'row',
              flex: '1 0 auto',
              padding: 10,
              paddingRight: 14,
              backgroundColor: 'white',
              borderBottomWidth: 1,
              borderColor: colors.n9
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

            <View style={{ width: 90 }}>
              <Label title="BUDGETED" style={{ color: colors.n1 }} />
              <CellValue
                binding={reportBudget.totalBudgetedExpense}
                type="financial"
                style={[
                  styles.smallText,
                  { color: colors.n1, textAlign: 'right', fontWeight: '500' }
                ]}
                formatter={value => {
                  return format(-parseFloat(value || '0'), 'financial');
                }}
              />
            </View>
            <View style={{ width: 90 }}>
              <Label title="BALANCE" style={{ color: colors.n1 }} />
              <CellValue
                binding={rolloverBudget.totalBalance}
                type="financial"
                style={[
                  styles.smallText,
                  { color: colors.n1, textAlign: 'right', fontWeight: '500' }
                ]}
              />
            </View>
          </View>

          {/* <AndroidKeyboardAvoidingView includeStatusBar={true}> */}
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
                  editingId={editingCategory}
                  editMode={editMode}
                  gestures={this.gestures}
                  month={month}
                  onEditCategory={this.onEditCategory}
                  onAddCategory={onAddCategory}
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
              <React.Fragment>
                <View>
                  <BudgetGroups
                    categoryGroups={categoryGroups}
                    editingId={editingCategory}
                    editMode={editMode}
                    gestures={this.gestures}
                    onEditCategory={() => {}} //this.onEditCategory}
                    onAddCategory={onAddCategory}
                    onReorderCategory={onReorderCategory}
                    onReorderGroup={onReorderGroup}
                  />
                </View>

                {/* <DragDropHighlight /> */}
              </React.Fragment>
              //   )}
              // </DragDrop>
            )}
          </View>
          {/* </AndroidKeyboardAvoidingView> */}
        </View>
      </NamespaceContext.Provider>
    );
  }
}

function UnconnectedBudgetHeader({
  currentMonth,
  monthBounds,
  editMode,
  onDone,
  onPrevMonth,
  onNextMonth,
  sync,
  localPrefs
}) {
  // let [menuOpen, setMenuOpen] = useState(false);

  // let onMenuSelect = type => {
  //   setMenuOpen(false);

  //   switch (type) {
  //     case 'sync':
  //       sync();
  //       break;
  //     default:
  //   }
  // };

  let prevEnabled = currentMonth > monthBounds.start;
  let nextEnabled = currentMonth < monthUtils.subMonths(monthBounds.end, 1);

  let buttonStyle = {
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: 'transparent'
  };

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        flexShrink: 0,
        height: 50,
        justifyContent: 'center',
        backgroundColor: colors.p5
      }}
    >
      {!editMode && (
        <Button
          bare
          // hitSlop={{ top: 5, bottom: 5, left: 0, right: 30 }}

          onClick={prevEnabled && onPrevMonth}
          style={[
            buttonStyle,
            {
              left: 0,
              opacity: prevEnabled ? 1 : 0.6,
              padding: '5px 30px 5px 0'
            }
          ]}
        >
          <ArrowThinLeft style={{ color: colors.n11 }} width="15" height="15" />
        </Button>
      )}
      <Text
        style={[
          styles.mediumText,
          {
            marginTop: 12,
            marginBottom: 12,
            color: colors.n11,
            textAlign: 'center'
            // zIndex: -1
          }
        ]}
      >
        {monthUtils.format(currentMonth, "MMMM ''yy")}
      </Text>
      {editMode ? (
        <Button
          bare
          onClick={onDone}
          style={[
            buttonStyle,
            { position: 'absolute', top: 0, bottom: 0, right: 0 }
          ]}
          textStyle={{
            color: colors.n11,
            fontSize: 15,
            fontWeight: '500'
          }}
        >
          Done
        </Button>
      ) : (
        <>
          <Button
            bare
            onClick={nextEnabled && onNextMonth}
            // hitSlop={{ top: 5, bottom: 5, left: 30, right: 5 }}
            style={[buttonStyle, { opacity: nextEnabled ? 1 : 0.6 }]}
          >
            <ArrowThinRight
              style={{ color: colors.n11 }}
              width="15"
              height="15"
            />
          </Button>

          <SyncButton
            style={{
              color: 'white',
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              backgroundColor: 'transparent',
              paddingLeft: 12,
              paddingRight: 12
            }}
            localPrefs={localPrefs}
            onSync={sync}
          />
          {/* <Button
            bare
            onClick={() => setMenuOpen(true)}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              backgroundColor: 'transparent',
              paddingLeft: 12,
              paddingRight: 12
            }}
          >
            {menuOpen && (
              <Tooltip
                position="bottom-right"
                style={{ padding: 0 }}
                onClose={() => setMenuOpen(false)}
              >
                <Menu
                  onMenuSelect={onMenuSelect}
                  items={[
                    { name: 'change-password', text: 'Change password' },
                    { name: 'sign-out', text: 'Sign out' }
                  ].filter(x => x)}
                />
              </Tooltip>
            )} */}

          {/* <DotsHorizontalTriple
              width="20"
              height="20"
              style={{ color: 'white' }}
            /> */}
          {/* </Button> */}
        </>
      )}
    </View>
  );
}

const BudgetHeader = connect(
  state => ({
    localPrefs: state.prefs.local
  }),
  actions
)(UnconnectedBudgetHeader);
