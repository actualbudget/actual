import React, { memo, useRef } from 'react';
import { useDispatch } from 'react-redux';

import memoizeOne from 'memoize-one';

import { collapseModals, pushModal } from 'loot-core/client/actions';
import { rolloverBudget, reportBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';

import { useLocalPref } from '../../../hooks/useLocalPref';
import { useNavigate } from '../../../hooks/useNavigate';
import { useShrinkFontSizeOnOverflow } from '../../../hooks/useShrinkFontSizeOnOverflow';
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
import { makeAmountFullStyle, makeAmountGrey } from '../../budget/util';
import { Button } from '../../common/Button';
import { Card } from '../../common/Card';
import { Label } from '../../common/Label';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { MobilePageHeader, Page } from '../../Page';
import { CellValue } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { MOBILE_NAV_HEIGHT } from '../MobileNavTabs';
import { PullToRefresh } from '../PullToRefresh';

import { ListItem, ROW_HEIGHT } from './ListItem';

const PILL_STYLE = {
  borderRadius: 16,
  color: theme.pillText,
  backgroundColor: theme.pillBackgroundLight,
};

function getColumnWidth(show3Cols, isSidebar = false) {
  // If show3Cols = 40vw | 20vw | 20vw | 20vw,
  // Else = 60vw | 20vw | 20vw,
  if (!isSidebar) {
    return '20vw';
  }
  return show3Cols ? '30vw' : '50vw';
}

function ToBudget({ toBudget, onClick, show3Cols }) {
  const amount = useSheetValue(toBudget);
  const format = useFormat();
  const amountTextContainerRef = useRef();
  const amountFontSize = useShrinkFontSizeOnOverflow({
    containerRef: amountTextContainerRef,
    initialFontSize: 12,
  });

  return (
    <Button
      type="bare"
      style={{ maxWidth: getColumnWidth(show3Cols, true) }}
      onClick={onClick}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Label
            title={amount < 0 ? 'Overbudgeted' : 'To Budget'}
            style={{
              ...(amount < 0 ? styles.smallText : {}),
              color: theme.formInputText,
              flexShrink: 0,
              textAlign: 'left',
            }}
          />
          <CellValue
            binding={toBudget}
            type="financial"
            formatter={value => (
              <View ref={amountTextContainerRef}>
                <Text
                  style={{
                    maxWidth: getColumnWidth(show3Cols, true),
                    fontSize: amountFontSize,
                    fontWeight: '700',
                    color: amount < 0 ? theme.errorText : theme.formInputText,
                  }}
                >
                  {format(value, 'financial')}
                </Text>
              </View>
            )}
          />
        </View>
        <SvgCheveronRight
          style={{ flexShrink: 0, color: theme.pageTextSubdued }}
          width={14}
          height={14}
        />
      </View>
    </Button>
  );
}

function Saved({ projected, onClick, show3Cols }) {
  const binding = projected
    ? reportBudget.totalBudgetedSaved
    : reportBudget.totalSaved;

  const saved = useSheetValue(binding) || 0;
  const format = useFormat();
  const isNegative = saved < 0;
  const amountTextContainerRef = useRef();
  const amountFontSize = useShrinkFontSizeOnOverflow({
    containerRef: amountTextContainerRef,
    initialFontSize: 12,
  });

  return (
    <Button
      type="bare"
      style={{
        maxWidth: getColumnWidth(show3Cols, true),
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
      onClick={onClick}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          {projected ? (
            <>
              <Label
                title="Projected"
                style={{
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
                color: theme.formInputText,
                textAlign: 'left',
              }}
            />
          )}

          <CellValue
            binding={binding}
            type="financial"
            formatter={value => (
              <View ref={amountTextContainerRef}>
                <Text
                  style={{
                    maxWidth: getColumnWidth(show3Cols, true),
                    fontSize: amountFontSize,
                    fontWeight: '700',
                    color: projected
                      ? theme.warningText
                      : isNegative
                        ? theme.errorTextDark
                        : theme.formInputText,
                  }}
                >
                  {format(value, 'financial')}
                </Text>
              </View>
            )}
          />
        </View>
        <SvgCheveronRight
          style={{ flexShrink: 0, color: theme.pageTextSubdued }}
          width={14}
          height={14}
        />
      </View>
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
  ...props
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
      getStyle={makeAmountGrey}
      data-testid={name}
      onClick={onOpenCategoryBudgetMenu}
      {...props}
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
  const format = useFormat();
  const budgetedTextContainerRef = useRef();
  const budgetedTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: budgetedTextContainerRef,
    initialFontSize: 12,
  });
  const spentTextContainerRef = useRef();
  const spentTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: spentTextContainerRef,
    initialFontSize: 12,
  });
  const balanceTextContainerRef = useRef();
  const balanceTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: balanceTextContainerRef,
    initialFontSize: 12,
  });

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
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <Button
          type="bare"
          style={{
            maxWidth: getColumnWidth(show3Cols, true),
          }}
          onClick={() => onEdit?.(category.id)}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Text
              style={{
                ...styles.lineClamp(2),
                maxWidth: getColumnWidth(show3Cols, true),
                textAlign: 'left',
                ...styles.smallText,
              }}
              data-testid="category-name"
            >
              {category.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.pageTextSubdued }}
              width={14}
              height={14}
            />
          </View>
        </Button>
      </View>
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          opacity,
        }}
      >
        <View
          style={{
            ...(!show3Cols && !showBudgetedCol && { display: 'none' }),
            width: getColumnWidth(show3Cols),
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <BudgetCell
            name="budgeted"
            binding={budgeted}
            categoryId={category.id}
            month={month}
            onBudgetAction={onBudgetAction}
            formatter={value => (
              <Button
                type="bare"
                style={{ ...PILL_STYLE, maxWidth: getColumnWidth(show3Cols) }}
                ref={budgetedTextContainerRef}
              >
                <Text
                  style={{
                    textAlign: 'right',
                    fontSize: budgetedTextFontSize,
                  }}
                >
                  {format(value, 'financial')}
                </Text>
              </Button>
            )}
          />
        </View>
        <View
          style={{
            ...(!show3Cols && showBudgetedCol && { display: 'none' }),
            justifyContent: 'center',
            alignItems: 'flex-end',
            width: getColumnWidth(show3Cols),
            height: ROW_HEIGHT,
          }}
        >
          <CellValue
            name="spent"
            binding={spent}
            getStyle={makeAmountGrey}
            type="financial"
            onClick={onShowActivity}
            formatter={value => (
              <Button
                type="bare"
                style={{ ...PILL_STYLE, maxWidth: getColumnWidth(show3Cols) }}
                ref={spentTextContainerRef}
              >
                <Text
                  style={{
                    textAlign: 'right',
                    fontSize: spentTextFontSize,
                  }}
                >
                  {format(value, 'financial')}
                </Text>
              </Button>
            )}
          />
        </View>
        <View
          style={{
            ...styles.noTapHighlight,
            justifyContent: 'center',
            alignItems: 'flex-end',
            width: getColumnWidth(show3Cols),
            height: ROW_HEIGHT,
          }}
        >
          <span role="button" onClick={() => onOpenBalanceMenu?.()}>
            <BalanceWithCarryover
              carryover={carryover}
              balance={balance}
              goal={goal}
              budgeted={budgeted}
              formatter={value => (
                <Button
                  type="bare"
                  style={{ ...PILL_STYLE, maxWidth: getColumnWidth(show3Cols) }}
                  ref={balanceTextContainerRef}
                >
                  <Text
                    style={{
                      ...makeAmountFullStyle(value),
                      fontSize: balanceTextFontSize,
                    }}
                  >
                    {format(value, 'financial')}
                  </Text>
                </Button>
              )}
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
  const format = useFormat();
  const budgetedTextContainerRef = useRef();
  const budgetedTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: budgetedTextContainerRef,
    initialFontSize: 12,
  });
  const spentTextContainerRef = useRef();
  const spentTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: spentTextContainerRef,
    initialFontSize: 12,
  });
  const balanceTextContainerRef = useRef();
  const balanceTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: balanceTextContainerRef,
    initialFontSize: 12,
  });

  const content = (
    <ListItem
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.tableRowHeaderBackground,
        opacity: !!group.hidden ? 0.5 : undefined,
        paddingLeft: 0,
      }}
      data-testid={`expense-group-header-${group.name}`}
      innerRef={listItemRef}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'flex-start',
        }}
      >
        <Button
          type="bare"
          style={{ flexShrink: 0, ...styles.noTapHighlight }}
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
        <Button
          type="bare"
          style={{
            maxWidth: getColumnWidth(show3Cols, true),
          }}
          onClick={() => onEdit?.(group.id)}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Text
              style={{
                ...styles.lineClamp(2),
                maxWidth: getColumnWidth(show3Cols, true),
                textAlign: 'left',
                ...styles.smallText,
              }}
              data-testid="group-name"
            >
              {group.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.pageTextSubdued }}
              width={14}
              height={14}
            />
          </View>
        </Button>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          opacity,
        }}
      >
        <View
          style={{
            ...(!show3Cols && !showBudgetedCol && { display: 'none' }),
            width: getColumnWidth(show3Cols),
            height: ROW_HEIGHT,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <CellValue
            binding={budgeted}
            type="financial"
            formatter={value => (
              <View
                ref={budgetedTextContainerRef}
                style={{ alignItems: 'flex-end' }}
              >
                <Text
                  style={{
                    maxWidth: getColumnWidth(show3Cols),
                    fontSize: budgetedTextFontSize,
                    fontWeight: '500',
                    textAlign: 'right',
                    padding: '0 5px',
                  }}
                >
                  {format(value, 'financial')}
                </Text>
              </View>
            )}
          />
        </View>
        <View
          style={{
            ...(!show3Cols && showBudgetedCol && { display: 'none' }),
            width: getColumnWidth(show3Cols),
            height: ROW_HEIGHT,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <CellValue
            binding={spent}
            type="financial"
            formatter={value => (
              <View
                ref={spentTextContainerRef}
                style={{ alignItems: 'flex-end' }}
              >
                <Text
                  style={{
                    maxWidth: getColumnWidth(show3Cols),
                    fontSize: spentTextFontSize,
                    fontWeight: '500',
                    textAlign: 'right',
                    padding: '0 5px',
                  }}
                >
                  {format(value, 'financial')}
                </Text>
              </View>
            )}
          />
        </View>
        <View
          style={{
            width: getColumnWidth(show3Cols),
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <CellValue
            binding={balance}
            type="financial"
            formatter={value => (
              <View
                ref={balanceTextContainerRef}
                style={{ alignItems: 'flex-end' }}
              >
                <Text
                  style={{
                    maxWidth: getColumnWidth(show3Cols),
                    fontSize: balanceTextFontSize,
                    fontWeight: '500',
                    textAlign: 'right',
                    padding: '0 5px',
                  }}
                >
                  {format(value, 'financial')}
                </Text>
              </View>
            )}
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
  const format = useFormat();
  const budgetedTextContainerRef = useRef();
  const budgetedTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: budgetedTextContainerRef,
    initialFontSize: 12,
  });
  const balanceTextContainerRef = useRef();
  const balanceTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: balanceTextContainerRef,
    initialFontSize: 12,
  });

  return (
    <ListItem
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.tableRowHeaderBackground,
        opacity: !!group.hidden ? 0.5 : undefined,
        paddingLeft: 0,
      }}
      innerRef={listItemRef}
      data-testid={`income-group-header-${group.name}`}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          width: getColumnWidth(false, true),
        }}
      >
        <Button
          type="bare"
          style={{
            flexShrink: 0,
            ...styles.noTapHighlight,
          }}
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
        <Button
          type="bare"
          style={{
            maxWidth: getColumnWidth(false, true),
          }}
          onClick={() => onEdit?.(group.id)}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Text
              style={{
                ...styles.lineClamp(2),
                maxWidth: getColumnWidth(false, true),
                textAlign: 'left',
                ...styles.smallText,
              }}
              data-testid="group-name"
            >
              {group.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.pageTextSubdued }}
              width={14}
              height={14}
            />
          </View>
        </Button>
      </View>
      {budgeted && (
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'flex-end',
            width: getColumnWidth(false, false),
            height: ROW_HEIGHT,
          }}
        >
          <CellValue
            binding={budgeted}
            type="financial"
            formatter={value => (
              <View
                ref={budgetedTextContainerRef}
                style={{ alignItems: 'flex-end' }}
              >
                <Text
                  innerRef={budgetedTextContainerRef}
                  style={{
                    maxWidth: getColumnWidth(false, false),
                    textAlign: 'right',
                    fontSize: budgetedTextFontSize,
                    fontWeight: '500',
                    padding: '0 5px',
                  }}
                >
                  {format(value, 'financial')}
                </Text>
              </View>
            )}
          />
        </View>
      )}
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'flex-end',
          width: getColumnWidth(false, false),
          height: ROW_HEIGHT,
        }}
      >
        <CellValue
          binding={balance}
          type="financial"
          formatter={value => (
            <View
              ref={balanceTextContainerRef}
              style={{ alignItems: 'flex-end' }}
            >
              <Text
                style={{
                  maxWidth: getColumnWidth(false, false),
                  textAlign: 'right',
                  fontSize: balanceTextFontSize,
                  fontWeight: '500',
                }}
              >
                {format(value, 'financial')}
              </Text>
            </View>
          )}
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
  const format = useFormat();
  const budgetedTextContainerRef = useRef();
  const budgetedTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: budgetedTextContainerRef,
    initialFontSize: 12,
  });
  const balanceTextContainerRef = useRef();
  const balanceTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: balanceTextContainerRef,
    initialFontSize: 12,
  });

  return (
    <ListItem
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
        borderTopWidth: index > 0 ? 1 : 0,
        opacity: !!category.hidden ? 0.5 : undefined,
        ...style,
      }}
      data-testid="row"
      innerRef={listItemRef}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: getColumnWidth(false, true),
        }}
      >
        <Button
          type="bare"
          style={{
            maxWidth: getColumnWidth(false, true),
          }}
          onClick={() => onEdit?.(category.id)}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Text
              style={{
                ...styles.lineClamp(2),
                maxWidth: getColumnWidth(false, true),
                textAlign: 'left',
                ...styles.smallText,
              }}
              data-testid="category-name"
            >
              {category.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.pageTextSubdued }}
              width={14}
              height={14}
            />
          </View>
        </Button>
      </View>
      {budgeted && (
        <View
          style={{
            width: getColumnWidth(false),
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <BudgetCell
            name="budgeted"
            binding={budgeted}
            categoryId={category.id}
            month={month}
            onBudgetAction={onBudgetAction}
            formatter={value => (
              <Button
                type="bare"
                style={{ ...PILL_STYLE, maxWidth: getColumnWidth(false) }}
                ref={budgetedTextContainerRef}
              >
                <Text
                  style={{
                    textAlign: 'right',
                    fontSize: budgetedTextFontSize,
                  }}
                >
                  {format(value, 'financial')}
                </Text>
              </Button>
            )}
          />
        </View>
      )}
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'flex-end',
          width: getColumnWidth(false),
          height: ROW_HEIGHT,
        }}
      >
        <CellValue
          binding={balance}
          type="financial"
          formatter={value => (
            <View
              ref={balanceTextContainerRef}
              style={{ alignItems: 'flex-end' }}
            >
              <Text
                style={{
                  textAlign: 'right',
                  fontSize: balanceTextFontSize,
                  maxWidth: getColumnWidth(false),
                }}
              >
                {format(value, 'financial')}
              </Text>
            </View>
          )}
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
        {type === 'report' && (
          <Label title="Budgeted" style={{ width: getColumnWidth(false) }} />
        )}
        <Label title="Received" style={{ width: getColumnWidth(false) }} />
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
  const budgetedTextContainerRef = useRef();
  const budgetedTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: budgetedTextContainerRef,
    initialFontSize: 12,
  });
  const spentTextContainerRef = useRef();
  const spentTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: spentTextContainerRef,
    initialFontSize: 12,
  });
  const balanceTextContainerRef = useRef();
  const balanceTextFontSize = useShrinkFontSizeOnOverflow({
    containerRef: balanceTextContainerRef,
    initialFontSize: 12,
  });

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
      header={
        <MobilePageHeader
          title={
            <MonthSelector
              month={month}
              monthBounds={monthBounds}
              onOpenMonthMenu={onOpenBudgetMonthMenu}
              onPrevMonth={onPrevMonth}
              onNextMonth={onNextMonth}
            />
          }
          leftContent={
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
              <SvgCheveronRight
                style={{ flexShrink: 0, color: theme.mobileHeaderTextSubdued }}
                width="14"
                height="14"
              />
            </Button>
          }
        />
      }
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          padding: 10,
          backgroundColor: theme.tableRowHeaderBackground,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
        }}
      >
        <View
          style={{
            width: getColumnWidth(show3Cols, true),
            flexDirection: 'row',
          }}
        >
          {type === 'report' ? (
            <Saved
              projected={month >= monthUtils.currentMonth()}
              onClick={onShowBudgetSummary}
              show3Cols={show3Cols}
            />
          ) : (
            <ToBudget
              toBudget={rolloverBudget.toBudget}
              onClick={onShowBudgetSummary}
              show3Cols={show3Cols}
            />
          )}
        </View>
        <View
          style={{
            flexDirection: 'row',
            marginRight: 5,
          }}
        >
          {(show3Cols || !showSpentColumn) && (
            <View
              style={{
                width: getColumnWidth(show3Cols),
                alignItems: 'flex-end',
              }}
            >
              <Button
                type="bare"
                disabled={show3Cols}
                onClick={toggleDisplay}
                style={{
                  maxWidth: getColumnWidth(show3Cols),
                  ...buttonStyle,
                  background:
                    !showSpentColumn && !show3Cols
                      ? `linear-gradient(-45deg, ${theme.formInputBackgroundSelection} 8px, transparent 0)`
                      : null,
                }}
              >
                <View style={{ alignItems: 'flex-end' }}>
                  <Label
                    title="Budgeted"
                    style={{ color: theme.buttonNormalText, padding: '0 5px' }}
                  />
                  <CellValue
                    binding={
                      type === 'report'
                        ? reportBudget.totalBudgetedExpense
                        : rolloverBudget.totalBudgeted
                    }
                    type="financial"
                    formatter={value => (
                      <View
                        ref={budgetedTextContainerRef}
                        style={{ alignItems: 'flex-end' }}
                      >
                        <Text
                          style={{
                            maxWidth: getColumnWidth(show3Cols),
                            color: theme.formInputText,
                            textAlign: 'right',
                            fontSize: budgetedTextFontSize,
                            fontWeight: '500',
                            padding: '0 5px',
                          }}
                        >
                          {format(value, 'financial')}
                        </Text>
                      </View>
                    )}
                  />
                </View>
              </Button>
            </View>
          )}
          {(show3Cols || showSpentColumn) && (
            <View
              style={{
                width: getColumnWidth(show3Cols),
                alignItems: 'flex-end',
              }}
            >
              <Button
                type="bare"
                disabled={show3Cols}
                onClick={toggleDisplay}
                style={{
                  maxWidth: getColumnWidth(show3Cols),
                  ...buttonStyle,
                  background:
                    showSpentColumn && !show3Cols
                      ? `linear-gradient(45deg, ${theme.formInputBackgroundSelection} 8px, transparent 0)`
                      : null,
                }}
              >
                <View>
                  <Label
                    title="Spent"
                    style={{ color: theme.formInputText, padding: '0 5px' }}
                  />
                  <CellValue
                    binding={
                      type === 'report'
                        ? reportBudget.totalSpent
                        : rolloverBudget.totalSpent
                    }
                    type="financial"
                    formatter={value => (
                      <View
                        ref={spentTextContainerRef}
                        style={{ alignItems: 'flex-end' }}
                      >
                        <Text
                          style={{
                            maxWidth: getColumnWidth(show3Cols),
                            color: theme.formInputText,
                            textAlign: 'right',
                            fontSize: spentTextFontSize,
                            fontWeight: '500',
                            padding: '0 5px',
                          }}
                        >
                          {format(value, 'financial')}
                        </Text>
                      </View>
                    )}
                  />
                </View>
              </Button>
            </View>
          )}
          <View
            style={{ width: getColumnWidth(show3Cols), alignItems: 'flex-end' }}
          >
            <Label
              title="Balance"
              style={{ color: theme.formInputText, padding: '0 5px' }}
            />
            <CellValue
              binding={
                type === 'report'
                  ? reportBudget.totalLeftover
                  : rolloverBudget.totalBalance
              }
              type="financial"
              formatter={value => (
                <View
                  ref={balanceTextContainerRef}
                  style={{ alignItems: 'flex-end' }}
                >
                  <Text
                    style={{
                      maxWidth: getColumnWidth(show3Cols),
                      color: theme.formInputText,
                      textAlign: 'right',
                      fontSize: balanceTextFontSize,
                      fontWeight: '500',
                      padding: '0 5px',
                    }}
                  >
                    {format(value, 'financial')}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </View>
      <PullToRefresh onRefresh={onRefresh}>
        <View
          data-testid="budget-table"
          style={{
            backgroundColor: theme.pageBackground,
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
