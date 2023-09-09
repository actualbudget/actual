import React, {
  Component,
  memo,
  PureComponent,
  useState,
  useEffect,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import {
//   RectButton,
//   PanGestureHandler,
//   NativeViewGestureHandler
// } from 'react-native-gesture-handler';
// import Animated, { Easing } from 'react-native-reanimated';
// import AndroidKeyboardAvoidingView from './AndroidKeyboardAvoidingView';

import memoizeOne from 'memoize-one';

import { savePrefs } from 'loot-core/src/client/actions';
import { rolloverBudget, reportBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';
import { amountToInteger, integerToAmount } from 'loot-core/src/shared/util';

import Add from '../../icons/v1/Add';
import ArrowThinLeft from '../../icons/v1/ArrowThinLeft';
import ArrowThinRight from '../../icons/v1/ArrowThinRight';
import { colors, styles } from '../../style';
import Button from '../common/Button';
import Card from '../common/Card';
import Label from '../common/Label';
import Text from '../common/Text';
import View from '../common/View';
import { useServerURL } from '../ServerContext';
import CellValue from '../spreadsheet/CellValue';
import NamespaceContext from '../spreadsheet/NamespaceContext';
import useFormat from '../spreadsheet/useFormat';
import useSheetValue from '../spreadsheet/useSheetValue';
import { SyncButton } from '../Titlebar';
import { AmountInput } from '../util/AmountInput';
// import {
//   AmountAccessoryContext,
//   MathOperations
// } from '../mobile/AmountInput';

// import { DragDrop, Draggable, Droppable, DragDropHighlight } from './dragdrop';
import { ListItem, ROW_HEIGHT } from './MobileTable';

function ToBudget({ toBudget, onClick }) {
  let amount = useSheetValue(toBudget);
  let format = useFormat();
  return (
    <Button
      type="bare"
      style={{ flexDirection: 'column', alignItems: 'flex-start' }}
      onClick={onClick}
    >
      <Label
        title={amount < 0 ? 'OVERBUDGETED' : 'TO BUDGET'}
        style={{ color: colors.n1, flexShrink: 0 }}
      />
      <Text
        style={{
          ...styles.smallText,
          fontWeight: '500',
          color: amount < 0 ? colors.r4 : colors.n1,
        }}
      >
        {format(amount, 'financial')}
      </Text>
    </Button>
  );
}

function Saved({ projected }) {
  let budgetedSaved = useSheetValue(reportBudget.totalBudgetedSaved) || 0;
  let totalSaved = useSheetValue(reportBudget.totalSaved) || 0;
  let format = useFormat();
  let saved = projected ? budgetedSaved : totalSaved;
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
        <Label title="PROJECTED SAVINGS" style={{ color: colors.n1 }} />
      ) : (
        <Label
          title={isNegative ? 'OVERSPENT' : 'SAVED'}
          style={{ color: colors.n1 }}
        />
      )}

      <Text
        style={{
          ...styles.smallText,
          fontWeight: '500',
          color: projected ? colors.y3 : isNegative ? colors.r4 : colors.n1,
        }}
      >
        {format(saved, 'financial')}
      </Text>
    </View>
  );
}

const BudgetCell = memo(function BudgetCell(props) {
  const {
    name,
    binding,
    editing,
    style,
    textStyle,
    categoryId,
    month,
    onBudgetAction,
  } = props;

  let sheetValue = useSheetValue(binding);
  let format = useFormat();

  return (
    <View style={style}>
      <AmountInput
        value={integerToAmount(sheetValue || 0)}
        style={{
          height: ROW_HEIGHT - 4,
          transform: 'translateX(6px)',
          ...(!editing && {
            opacity: 0,
            position: 'absolute',
            top: 0,
          }),
        }}
        focused={editing}
        textStyle={{ ...styles.smallText, ...textStyle }}
        onChange={() => {}} // temporarily disabled for read-only view
        onBlur={value => {
          onBudgetAction(month, 'budget-amount', {
            category: categoryId,
            amount: amountToInteger(value),
          });
        }}
      />

      <View
        style={{
          justifyContent: 'center',
          height: ROW_HEIGHT - 4,
          ...(editing && { display: 'none' }),
        }}
      >
        <Text style={{ ...styles.smallText, ...textStyle }} data-testid={name}>
          {format(sheetValue || 0, 'financial')}
        </Text>
      </View>
    </View>
  );
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        opacity: pending ? 1 : 0.4,
      }}
    >
      <TotalsRow group={group} blank={true} />

      {group.categories.map((cat, index) => (
        <BudgetCategory
          key={cat.id}
          category={cat}
          blank={true}
          index={index}
        />
      ))}
    </Card>
    // </Animated.View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        borderRadius: 4,
      }}
    >
      <Text style={styles.smallText}>{name}</Text>
    </ListItem>
    // </Animated.View>
  );
}

class BudgetCategory extends PureComponent {
  constructor(props) {
    super(props);

    let { editMode, blank } = props;
    this.opacity = editMode || blank ? 0 : 1;
  }

  render() {
    let {
      category,
      editing,
      index,
      style,
      month,
      onBudgetAction,
      smallVPWidth,
      showBudgetView,
    } = this.props;
    let budgeted = rolloverBudget.catBudgeted(category.id);
    let balance = rolloverBudget.catBalance(category.id);
    let spent = rolloverBudget.catSumAmount(category.id);

    let content = !category.hidden && (
      <ListItem
        style={{
          backgroundColor: editing ? colors.p11 : 'transparent',
          borderBottomWidth: 0,
          borderTopWidth: index > 0 ? 1 : 0,
          ...style,
        }}
        data-testid="row"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.smallText} data-testid="category-name">
            {category.name}
          </Text>
        </View>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            opacity: this.opacity,
          }}
        >
          {!smallVPWidth ? (
            <BudgetCell
              name="budgeted"
              binding={budgeted}
              editing={editing}
              style={{ width: 90 }}
              textStyle={{ ...styles.smallText, textAlign: 'right' }}
              categoryId={category.id}
              month={month}
              onBudgetAction={onBudgetAction}
            />
          ) : !showBudgetView ? (
            <BudgetCell
              name="budgeted"
              binding={budgeted}
              editing={editing}
              style={{ width: 90 }}
              textStyle={{ ...styles.smallText, textAlign: 'right' }}
              categoryId={category.id}
              month={month}
              onBudgetAction={onBudgetAction}
            />
          ) : null}
          {!smallVPWidth ? (
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
          ) : showBudgetView ? (
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
            getStyle={value => value < 0 && { color: colors.r4 }}
            type="financial"
          />
        </View>
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

class TotalsRow extends PureComponent {
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
    let { group, editMode, onAddCategory, smallVPWidth, showBudgetView } =
      this.props;
    let content = (
      <ListItem
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.n11,
        }}
        data-testid="totals"
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{ ...styles.smallText, fontWeight: '500' }}
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
            opacity: this.opacity,
          }}
        >
          {!smallVPWidth ? (
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
          ) : !showBudgetView ? (
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
          {!smallVPWidth ? (
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
          ) : showBudgetView ? (
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
              <Add width={15} height={15} />
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
class IncomeCategory extends PureComponent {
  render() {
    const {
      name,
      budget,
      hidden,
      balance,
      style,
      nameTextStyle,
      amountTextStyle,
    } = this.props;
    if (hidden) {
      return null;
    }
    return (
      <ListItem
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 10,
          backgroundColor: 'transparent',
          ...style,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{ ...styles.smallText, ...nameTextStyle }}
            data-testid="name"
          >
            {name}
          </Text>
        </View>
        {budget && (
          <CellValue
            binding={budget}
            style={{
              ...styles.smallText,
              width: 90,
              textAlign: 'right',
              ...amountTextStyle,
            }}
            type="financial"
          />
        )}
        <CellValue
          binding={balance}
          style={{
            ...styles.smallText,
            width: 90,
            textAlign: 'right',
            ...amountTextStyle,
          }}
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

class BudgetGroup extends PureComponent {
  render() {
    const {
      group,
      // editingId,
      editMode,
      // gestures,
      month,
      onEditCategory,
      onReorderCategory,
      // onReorderGroup,
      onAddCategory,
      onBudgetAction,
      showBudgetView,
      smallVPWidth,
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
    if (!group.hidden) {
      return editable(
        <Card
          style={{
            marginTop: 7,
            marginBottom: 7,
          }}
        >
          <TotalsRow
            group={group}
            showBudgetView={showBudgetView}
            budgeted={rolloverBudget.groupBudgeted(group.id)}
            balance={rolloverBudget.groupBalance(group.id)}
            smallVPWidth={smallVPWidth}
            editMode={editMode}
            onAddCategory={onAddCategory}
            onReorderCategory={onReorderCategory}
          />

          {group.categories.map((category, index) => {
            // const editing = editingId === category.id;
            return (
              <BudgetCategory
                smallVPWidth={smallVPWidth}
                key={category.id}
                index={index}
                category={category}
                showBudgetView={showBudgetView}
                editing={undefined} //editing}
                editMode={editMode}
                //gestures={gestures}
                month={month}
                onEdit={onEditCategory}
                onReorder={onReorderCategory}
                onBudgetAction={onBudgetAction}
              />
            );
          })}
        </Card>,
      );
    } else {
      return null;
    }
  }
}

class IncomeBudgetGroup extends Component {
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
            marginRight: 14,
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
                hidden={category.hidden}
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

class BudgetGroups extends Component {
  getGroups = memoizeOne(groups => {
    return {
      incomeGroup: groups.find(group => group.is_income),
      expenseGroups: groups.filter(group => !group.is_income),
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
      onBudgetAction,
      showBudgetView,
      smallVPWidth,
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
              showBudgetView={showBudgetView}
              editMode={undefined} //editMode}
              gestures={gestures}
              month={month}
              onEditCategory={onEditCategory}
              onAddCategory={onAddCategory}
              onReorderCategory={onReorderCategory}
              onReorderGroup={onReorderGroup}
              onBudgetAction={onBudgetAction}
              smallVPWidth={smallVPWidth}
            />
          );
        })}

        {incomeGroup && <IncomeBudgetGroup type={type} group={incomeGroup} />}
      </View>
    );
  }
}

export function BudgetTable(props) {
  const [editingCategory, setEditingCategory] = useState(null);
  function onEditCategory(id) {
    setEditingCategory(id);
  }

  const [smallVPWidth, setSmallVPWidth] = useState(window.outerWidth <= 365);

  useEffect(() => {
    const handleResize = () => {
      setSmallVPWidth(window.outerWidth <= 365);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
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
    onEditMode,
    onReorderCategory,
    onReorderGroup,
    onShowBudgetDetails,
    onOpenActionSheet,
    onBudgetAction,
  } = props;

  // let editMode = false; // neuter editMode -- sorry, not rewriting drag-n-drop right now
  let currentMonth = monthUtils.currentMonth();
  let format = useFormat();

  const toggleMobileDisplayPref = useSelector(state => {
    return (
      (state.prefs.local && state.prefs.local.toggleMobileDisplayPref) || true
    );
  });

  let [showBudgetView, setshowBudgetView] = useState(
    !toggleMobileDisplayPref &&
      !document.cookie.match(/toggleMobileDisplayPref=true/),
  );

  let dispatch = useDispatch();

  function toggleDisplay() {
    setshowBudgetView(!showBudgetView);
    if (!showBudgetView) {
      // remember the pref indefinitely
      dispatch(savePrefs({ toggleMobileDisplayPref: true }));
    } else {
      // Set a cookie for 5 minutes
      let d = new Date();
      d.setTime(d.getTime() + 1000 * 60 * 5);
      document.cookie =
        'toggleMobileDisplayPref=true;path=/;expires=' + d.toUTCString();
    }
  }

  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month, type)}>
      <View style={{ flex: 1, overflowY: 'hidden' }} data-testid="budget-table">
        <BudgetHeader
          smallVPWidth={smallVPWidth}
          currentMonth={month}
          toggleDisplay={toggleDisplay}
          showBudgetView={showBudgetView}
          monthBounds={monthBounds}
          editMode={editMode}
          onDone={() => onEditMode(false)}
          onOpenActionSheet={onOpenActionSheet}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
        />
        <View
          style={{
            flexDirection: 'row',
            flex: '0 0 auto',
            padding: 10,
            paddingRight: 14,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderColor: colors.n9,
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
          {!smallVPWidth ? (
            <View style={{ width: 90, justifyContent: 'center' }}>
              <Label title="BUDGETED" style={{ color: colors.n1 }} />
              <CellValue
                binding={reportBudget.totalBudgetedExpense}
                type="financial"
                style={{
                  ...styles.smallText,
                  color: colors.n1,
                  textAlign: 'right',
                  fontWeight: '500',
                }}
                formatter={value => {
                  return format(-parseFloat(value || '0'), 'financial');
                }}
              />
            </View>
          ) : !showBudgetView ? (
            <View style={{ width: 90, justifyContent: 'center' }}>
              <Label title="BUDGETED" style={{ color: colors.n1 }} />
              <CellValue
                binding={reportBudget.totalBudgetedExpense}
                type="financial"
                style={{
                  ...styles.smallText,
                  color: colors.n1,
                  textAlign: 'right',
                  fontWeight: '500',
                }}
                formatter={value => {
                  return format(-parseFloat(value || '0'), 'financial');
                }}
              />
            </View>
          ) : null}
          {!smallVPWidth ? (
            <View
              style={{
                width: 90,
                justifyContent: 'center',
              }}
            >
              <Label title="SPENT" style={{ color: colors.n1 }} />
              <CellValue
                binding={rolloverBudget.totalSpent}
                type="financial"
                style={{
                  ...styles.smallText,
                  color: colors.n1,
                  textAlign: 'right',
                  fontWeight: '500',
                }}
              />
            </View>
          ) : showBudgetView ? (
            <View
              style={{
                width: 90,
                justifyContent: 'center',
              }}
            >
              <Label title="SPENT" style={{ color: colors.n1 }} />
              <CellValue
                binding={rolloverBudget.totalSpent}
                type="financial"
                style={{
                  ...styles.smallText,
                  color: colors.n1,
                  textAlign: 'right',
                  fontWeight: '500',
                }}
              />
            </View>
          ) : null}
          <View
            style={{
              width: 90,
              justifyContent: 'center',
            }}
          >
            <Label title="BALANCE" style={{ color: colors.n1 }} />
            <CellValue
              binding={rolloverBudget.totalBalance}
              type="financial"
              style={{
                ...styles.smallText,
                color: colors.n1,
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
                editingId={editingCategory}
                editMode={editMode}
                showBudgetView={showBudgetView}
                smallVPWidth={smallVPWidth}
                // gestures={gestures}
                month={month}
                onEditCategory={onEditCategory}
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
            <>
              <View>
                <BudgetGroups
                  categoryGroups={categoryGroups}
                  showBudgetView={showBudgetView}
                  smallVPWidth={smallVPWidth}
                  editingId={editingCategory}
                  editMode={editMode}
                  // gestures={gestures}
                  onEditCategory={() => {}} //onEditCategory}
                  onAddCategory={onAddCategory}
                  onReorderCategory={onReorderCategory}
                  onReorderGroup={onReorderGroup}
                />
              </View>

              {/* <DragDropHighlight /> */}
            </>
            //   )}
            // </DragDrop>
          )}
        </View>
      </View>
    </NamespaceContext.Provider>
  );
}

function BudgetHeader({
  currentMonth,
  monthBounds,
  editMode,
  onDone,
  onPrevMonth,
  onNextMonth,
  toggleDisplay,
  showBudgetView,
  smallVPWidth,
}) {
  let serverURL = useServerURL();

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
    backgroundColor: 'transparent',
  };

  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        flexShrink: 0,
        height: 50,
        justifyContent: 'center',
        backgroundColor: colors.p5,
      }}
    >
      {smallVPWidth ? (
        <Button
          type="bare"
          // hitSlop={{ top: 5, bottom: 5, left: 0, right: 30 }}
          onClick={toggleDisplay}
          style={{
            ...buttonStyle,
            left: 0,
            opacity: prevEnabled ? 1 : 0.6,
            padding: '10px',
            width: '80px',
            position: 'absolute',
          }}
        >
          <Text
            style={{
              ...styles.smallText,
              marginTop: 12,
              marginBottom: 12,
              color: colors.n11,
              textAlign: 'center',
              // zIndex: -1
            }}
          >
            {showBudgetView ? 'Show Budgeted' : 'Show Spent'}
          </Text>
        </Button>
      ) : null}
      {!editMode && (
        <Button
          type="bare"
          // hitSlop={{ top: 5, bottom: 5, left: 0, right: 30 }}

          onClick={prevEnabled && onPrevMonth}
          style={{
            ...buttonStyle,
            left: 0,
            opacity: prevEnabled ? 1 : 0.6,
            padding: '5px 30px 5px 0',
          }}
        >
          <ArrowThinLeft style={{ color: colors.n11 }} width="15" height="15" />
        </Button>
      )}
      <Text
        style={{
          ...styles.mediumText,
          marginTop: 12,
          marginBottom: 12,
          color: colors.n11,
          textAlign: 'center',
          // zIndex: -1
        }}
      >
        {/* eslint-disable-next-line rulesdir/typography */}
        {monthUtils.format(currentMonth, "MMMM ''yy")}
      </Text>
      {editMode ? (
        <Button
          type="bare"
          onClick={onDone}
          style={{
            ...buttonStyle,
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
          }}
          textStyle={{
            color: colors.n11,
            fontSize: 15,
            fontWeight: '500',
          }}
        >
          Done
        </Button>
      ) : (
        <>
          <Button
            type="bare"
            onClick={nextEnabled && onNextMonth}
            // hitSlop={{ top: 5, bottom: 5, left: 30, right: 5 }}
            style={{ ...buttonStyle, opacity: nextEnabled ? 1 : 0.6 }}
          >
            <ArrowThinRight
              style={{ color: colors.n11 }}
              width="15"
              height="15"
            />
          </Button>

          {serverURL && (
            <SyncButton
              isMobile
              style={{
                color: 'white',
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                backgroundColor: 'transparent',
                paddingLeft: 12,
                paddingRight: 12,
              }}
            />
          )}
          {/* <Button
            type="bare"
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
