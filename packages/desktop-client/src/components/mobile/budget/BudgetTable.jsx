import React, { memo, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { AutoTextSize } from 'auto-text-size';
import { css } from 'glamor';
import memoizeOne from 'memoize-one';

import { collapseModals, pushModal } from 'loot-core/client/actions';
import { groupById, integerToCurrency } from 'loot-core/shared/util';
import {
  envelopeBudget,
  trackingBudget,
  uncategorizedCount,
} from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';

import { useCategories } from '../../../hooks/useCategories';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useNavigate } from '../../../hooks/useNavigate';
import { useNotes } from '../../../hooks/useNotes';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { useUndo } from '../../../hooks/useUndo';
import { SvgLogo } from '../../../icons/logo';
import { SvgExpandArrow } from '../../../icons/v0';
import {
  SvgArrowThinLeft,
  SvgArrowThinRight,
  SvgArrowThickRight,
  SvgCheveronRight,
} from '../../../icons/v1';
import { SvgViewShow } from '../../../icons/v2';
import { useResponsive } from '../../../ResponsiveProvider';
import { theme, styles } from '../../../style';
import { BalanceWithCarryover } from '../../budget/BalanceWithCarryover';
import { makeAmountGrey, makeBalanceAmountStyle } from '../../budget/util';
import { Button } from '../../common/Button2';
import { Card } from '../../common/Card';
import { Label } from '../../common/Label';
import { Link } from '../../common/Link';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { MobilePageHeader, Page } from '../../Page';
import { PrivacyFilter } from '../../PrivacyFilter';
import { CellValue } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { MOBILE_NAV_HEIGHT } from '../MobileNavTabs';
import { PullToRefresh } from '../PullToRefresh';

import { ListItem } from './ListItem';

const PILL_STYLE = {
  borderRadius: 16,
  color: theme.pillText,
  backgroundColor: theme.pillBackgroundLight,
};

function getColumnWidth({ show3Cols, isSidebar = false, offset = 0 } = {}) {
  // If show3Cols = 35vw | 20vw | 20vw | 20vw,
  // Else = 45vw | 25vw | 25vw,
  if (!isSidebar) {
    return show3Cols ? `${20 + offset}vw` : `${25 + offset}vw`;
  }
  return show3Cols ? `${35 + offset}vw` : `${45 + offset}vw`;
}

function ToBudget({ toBudget, onPress, show3Cols }) {
  const amount = useSheetValue(toBudget);
  const format = useFormat();
  const sidebarColumnWidth = getColumnWidth({ show3Cols, isSidebar: true });

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: sidebarColumnWidth,
      }}
    >
      <Button variant="bare" onPress={onPress}>
        <View>
          <Label
            title={amount < 0 ? 'Overbudgeted' : 'To Budget'}
            style={{
              ...(amount < 0 ? styles.smallText : {}),
              color: theme.formInputText,
              flexShrink: 0,
              textAlign: 'left',
            }}
          />
          <CellValue binding={toBudget} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: amount < 0 ? theme.errorText : theme.formInputText,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <SvgCheveronRight
          style={{
            flexShrink: 0,
            color: theme.mobileHeaderTextSubdued,
            marginLeft: 5,
          }}
          width={14}
          height={14}
        />
      </Button>
    </View>
  );
}

function Saved({ projected, onPress, show3Cols }) {
  const binding = projected
    ? trackingBudget.totalBudgetedSaved
    : trackingBudget.totalSaved;

  const saved = useSheetValue(binding) || 0;
  const format = useFormat();
  const isNegative = saved < 0;
  const sidebarColumnWidth = getColumnWidth({ show3Cols, isSidebar: true });

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: sidebarColumnWidth,
      }}
    >
      <Button variant="bare" onPress={onPress}>
        <View style={{ alignItems: 'flex-start' }}>
          {projected ? (
            <View>
              <AutoTextSize
                as={Label}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                title="Projected Savings"
                style={{
                  color: theme.formInputText,
                  textAlign: 'left',
                  fontSize: 12,
                }}
              />
            </View>
          ) : (
            <Label
              title={isNegative ? 'Overspent' : 'Saved'}
              style={{
                color: theme.formInputText,
                textAlign: 'left',
              }}
            />
          )}

          <CellValue binding={binding} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: '700',
                      color: projected
                        ? theme.warningText
                        : isNegative
                          ? theme.errorTextDark
                          : theme.formInputText,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <SvgCheveronRight
          style={{
            flexShrink: 0,
            color: theme.mobileHeaderTextSubdued,
            marginLeft: 5,
          }}
          width={14}
          height={14}
        />
      </Button>
    </View>
  );
}

function BudgetCell({
  name,
  binding,
  style,
  category,
  month,
  onBudgetAction,
  children,
  ...props
}) {
  const columnWidth = getColumnWidth();
  const dispatch = useDispatch();
  const format = useFormat();
  const { showUndoNotification } = useUndo();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const modalBudgetType = budgetType === 'rollover' ? 'envelope' : 'tracking';

  const categoryBudgetMenuModal = `${modalBudgetType}-budget-menu`;
  const categoryNotes = useNotes(category.id);

  const onOpenCategoryBudgetMenu = () => {
    dispatch(
      pushModal(categoryBudgetMenuModal, {
        categoryId: category.id,
        month,
        onUpdateBudget: amount => {
          onBudgetAction(month, 'budget-amount', {
            category: category.id,
            amount,
          });
        },
        onCopyLastMonthAverage: () => {
          onBudgetAction(month, 'copy-single-last', {
            category: category.id,
          });
          showUndoNotification({
            message: `${category.name} budget has been set last to month’s budgeted amount.`,
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
            category: category.id,
          });
          showUndoNotification({
            message: `${category.name} budget has been set to ${numberOfMonths === 12 ? 'yearly' : `${numberOfMonths} month`} average.`,
          });
        },
        onApplyBudgetTemplate: () => {
          onBudgetAction(month, 'apply-single-category-template', {
            category: category.id,
          });
          showUndoNotification({
            message: `${category.name} budget templates have been applied.`,
            pre: categoryNotes,
          });
        },
      }),
    );
  };

  return (
    <CellValue
      binding={binding}
      type="financial"
      aria-label={`Budgeted amount for ${category.name} category`}
      {...props}
    >
      {({ type, name, value }) =>
        children?.({
          type,
          name,
          value,
          onPress: onOpenCategoryBudgetMenu,
        }) || (
          <Button
            variant="bare"
            style={{
              ...PILL_STYLE,
              maxWidth: columnWidth,
              ...makeAmountGrey(value),
            }}
            onPress={onOpenCategoryBudgetMenu}
            aria-label={`Open budget menu for ${category.name} category`}
          >
            <View>
              <PrivacyFilter>
                <AutoTextSize
                  key={value}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={{
                    maxWidth: columnWidth,
                    textAlign: 'right',
                    fontSize: 12,
                  }}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </View>
          </Button>
        )
      }
    </CellValue>
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
  longGoal,
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

  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemp = useSheetValue(goal);
  const goalValue = isGoalTemplatesEnabled ? goalTemp : null;

  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const modalBudgetType = budgetType === 'rollover' ? 'envelope' : 'tracking';
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const { list: categories } = useCategories();
  const categoriesById = groupById(categories);

  const onCarryover = useCallback(
    carryover => {
      onBudgetAction(month, 'carryover', {
        category: category.id,
        flag: carryover,
      });
      dispatch(collapseModals(`${modalBudgetType}-balance-menu`));
    },
    [modalBudgetType, category.id, dispatch, month, onBudgetAction],
  );

  const catBalance = useSheetValue(
    type === 'rollover'
      ? envelopeBudget.catBalance(category.id)
      : trackingBudget.catBalance(category.id),
  );
  const budgetedtmp = useSheetValue(budgeted);
  const balancetmp = useSheetValue(balance);
  const isLongGoal = useSheetValue(longGoal) === 1;
  const budgetedValue = isGoalTemplatesEnabled
    ? isLongGoal
      ? balancetmp
      : budgetedtmp
    : null;

  const onTransfer = useCallback(() => {
    dispatch(
      pushModal('transfer', {
        title: category.name,
        categoryId: category.id,
        month,
        amount: catBalance,
        onSubmit: (amount, toCategoryId) => {
          onBudgetAction(month, 'transfer-category', {
            amount,
            from: category.id,
            to: toCategoryId,
          });
          dispatch(collapseModals(`${modalBudgetType}-balance-menu`));
          showUndoNotification({
            message: `Transferred ${integerToCurrency(amount)} from ${category.name} to ${categoriesById[toCategoryId].name}.`,
          });
        },
        showToBeBudgeted: true,
      }),
    );
  }, [
    modalBudgetType,
    catBalance,
    categoriesById,
    category.id,
    category.name,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
  ]);

  const onCover = useCallback(() => {
    dispatch(
      pushModal('cover', {
        title: category.name,
        month,
        categoryId: category.id,
        onSubmit: fromCategoryId => {
          onBudgetAction(month, 'cover-overspending', {
            to: category.id,
            from: fromCategoryId,
          });
          dispatch(collapseModals(`${modalBudgetType}-balance-menu`));
          showUndoNotification({
            message: `Covered ${category.name} overspending from ${categoriesById[fromCategoryId].name}.`,
          });
        },
      }),
    );
  }, [
    modalBudgetType,
    categoriesById,
    category.id,
    category.name,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
  ]);

  const onOpenBalanceMenu = useCallback(() => {
    dispatch(
      pushModal(`${modalBudgetType}-balance-menu`, {
        categoryId: category.id,
        month,
        onCarryover,
        ...(budgetType === 'rollover' && { onTransfer, onCover }),
      }),
    );
  }, [
    modalBudgetType,
    budgetType,
    category.id,
    dispatch,
    month,
    onCarryover,
    onCover,
    onTransfer,
  ]);

  const listItemRef = useRef();
  const format = useFormat();
  const navigate = useNavigate();
  const onShowActivity = useCallback(() => {
    navigate(`/categories/${category.id}?month=${month}`);
  }, [category.id, month, navigate]);

  const sidebarColumnWidth = getColumnWidth({ show3Cols, isSidebar: true });
  const columnWidth = getColumnWidth({ show3Cols });

  const content = (
    <ListItem
      style={{
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
        borderTopWidth: index > 0 ? 1 : 0,
        opacity: isHidden ? 0.5 : undefined,
        ...style,
      }}
      data-testid="category-row"
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
          variant="bare"
          style={{
            maxWidth: sidebarColumnWidth,
          }}
          onPress={() => onEdit?.(category.id)}
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
                width: sidebarColumnWidth,
                textAlign: 'left',
                ...styles.smallText,
              }}
              data-testid="category-name"
            >
              {category.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.tableTextSubdued }}
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
            width: columnWidth,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <BudgetCell
            key={`${show3Cols}|${showBudgetedCol}`}
            binding={budgeted}
            type="financial"
            category={category}
            month={month}
            onBudgetAction={onBudgetAction}
          />
        </View>
        <View
          style={{
            ...(!show3Cols && showBudgetedCol && { display: 'none' }),
            width: columnWidth,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <CellValue
            binding={spent}
            type="financial"
            aria-label={`Spent amount for ${category.name} category`}
          >
            {({ type, value }) => (
              <Button
                variant="bare"
                style={{
                  ...PILL_STYLE,
                }}
                onPress={onShowActivity}
                aria-label={`Show transactions for ${category.name} category`}
              >
                <PrivacyFilter>
                  <AutoTextSize
                    key={`${value}|${show3Cols}|${showBudgetedCol}`}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      ...makeAmountGrey(value),
                      maxWidth: columnWidth,
                      textAlign: 'right',
                      fontSize: 12,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </Button>
            )}
          </CellValue>
        </View>
        <View
          style={{
            width: columnWidth,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <BalanceWithCarryover
            aria-label={`Balance for ${category.name} category`}
            type="financial"
            carryover={carryover}
            balance={balance}
            goal={goal}
            budgeted={budgeted}
            longGoal={longGoal}
            CarryoverIndicator={({ style }) => (
              <View
                style={{
                  position: 'absolute',
                  right: '-3px',
                  top: '-5px',
                  borderRadius: '50%',
                  backgroundColor: style?.color ?? theme.pillText,
                }}
              >
                <SvgArrowThickRight
                  width={11}
                  height={11}
                  style={{ color: theme.pillBackgroundLight }}
                />
              </View>
            )}
          >
            {({ type, value }) => (
              <Button
                variant="bare"
                style={{
                  ...PILL_STYLE,
                  maxWidth: columnWidth,
                }}
                onPress={onOpenBalanceMenu}
                aria-label={`Open balance menu for ${category.name} category`}
              >
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      maxWidth: columnWidth,
                      ...makeBalanceAmountStyle(
                        value,
                        goalValue,
                        budgetedValue,
                      ),
                      textAlign: 'right',
                      fontSize: 12,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </Button>
            )}
          </BalanceWithCarryover>
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
  const sidebarColumnWidth = getColumnWidth({
    show3Cols,
    isSidebar: true,
    offset: -3.5,
  });
  const columnWidth = getColumnWidth({ show3Cols });

  const amountStyle = {
    width: columnWidth,
    fontSize: 12,
    fontWeight: '500',
    paddingLeft: 5,
    textAlign: 'right',
  };

  const content = (
    <ListItem
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.tableRowHeaderBackground,
        opacity: !!group.hidden ? 0.5 : undefined,
        paddingLeft: 0,
      }}
      data-testid="category-group-row"
      innerRef={listItemRef}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          width: sidebarColumnWidth,
        }}
      >
        <Button
          variant="bare"
          className={String(
            css({
              flexShrink: 0,
              color: theme.pageTextSubdued,
              '&[data-pressed]': {
                backgroundColor: 'transparent',
              },
            }),
          )}
          onPress={() => onToggleCollapse?.(group.id)}
        >
          <SvgExpandArrow
            width={8}
            height={8}
            style={{
              flexShrink: 0,
              transition: 'transform .1s',
              transform: collapsed ? 'rotate(-90deg)' : '',
            }}
          />
        </Button>
        <Button
          variant="bare"
          style={{
            maxWidth: sidebarColumnWidth,
          }}
          onPress={() => onEdit?.(group.id)}
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
                width: sidebarColumnWidth,
                textAlign: 'left',
                ...styles.smallText,
                fontWeight: '500',
              }}
              data-testid="category-group-name"
            >
              {group.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.tableTextSubdued }}
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
          paddingRight: 5,
        }}
      >
        <View
          style={{ ...(!show3Cols && !showBudgetedCol && { display: 'none' }) }}
        >
          <CellValue binding={budgeted} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={amountStyle}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <View
          style={{ ...(!show3Cols && showBudgetedCol && { display: 'none' }) }}
        >
          <CellValue binding={spent} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={amountStyle}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <CellValue binding={balance} type="financial">
          {({ type, value }) => (
            <View>
              <PrivacyFilter>
                <AutoTextSize
                  key={value}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={amountStyle}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </View>
          )}
        </CellValue>
      </View>

      {/* {editMode && (
        <View>
          <Button
            onPointerUp={() => onAddCategory(group.id, group.is_income)}
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
  const sidebarColumnWidth = getColumnWidth({ isSidebar: true, offset: -13.5 });
  const columnWidth = getColumnWidth();

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
      data-testid="category-group-row"
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          width: sidebarColumnWidth,
        }}
      >
        <Button
          variant="bare"
          className={String(
            css({
              flexShrink: 0,
              color: theme.pageTextSubdued,
              '&[data-pressed]': {
                backgroundColor: 'transparent',
              },
            }),
          )}
          onPress={() => onToggleCollapse?.(group.id)}
        >
          <SvgExpandArrow
            width={8}
            height={8}
            style={{
              flexShrink: 0,
              transition: 'transform .1s',
              transform: collapsed ? 'rotate(-90deg)' : '',
            }}
          />
        </Button>
        <Button
          variant="bare"
          style={{
            maxWidth: sidebarColumnWidth,
          }}
          onPress={() => onEdit?.(group.id)}
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
                width: sidebarColumnWidth,
                textAlign: 'left',
                ...styles.smallText,
              }}
              data-testid="category-group-name"
            >
              {group.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.tableTextSubdued }}
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
          paddingRight: 5,
        }}
      >
        {budgeted && (
          <CellValue binding={budgeted} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      width: columnWidth,
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      paddingLeft: 5,
                      textAlign: 'right',
                      fontSize: 12,
                      fontWeight: '500',
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        )}
        <CellValue binding={balance} type="financial">
          {({ type, value }) => (
            <View>
              <PrivacyFilter>
                <AutoTextSize
                  key={value}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={{
                    width: columnWidth,
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    paddingLeft: 5,
                    textAlign: 'right',
                    fontSize: 12,
                    fontWeight: '500',
                  }}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </View>
          )}
        </CellValue>
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
  const sidebarColumnWidth = getColumnWidth({ isSidebar: true, offset: -10 });
  const columnWidth = getColumnWidth();

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
      data-testid="category-row"
      innerRef={listItemRef}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: sidebarColumnWidth,
        }}
      >
        <Button
          variant="bare"
          style={{
            maxWidth: sidebarColumnWidth,
          }}
          onPress={() => onEdit?.(category.id)}
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
                width: sidebarColumnWidth,
                textAlign: 'left',
                ...styles.smallText,
              }}
              data-testid="category-name"
            >
              {category.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.tableTextSubdued }}
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
        }}
      >
        {budgeted && (
          <View
            style={{
              width: columnWidth,
              justifyContent: 'center',
              alignItems: 'flex-end',
            }}
          >
            <BudgetCell
              binding={budgeted}
              type="financial"
              category={category}
              month={month}
              onBudgetAction={onBudgetAction}
            />
          </View>
        )}
        <CellValue
          binding={balance}
          type="financial"
          aria-label={`Balance for ${category.name} category`}
        >
          {({ type, value }) => (
            <View>
              <PrivacyFilter>
                <AutoTextSize
                  key={value}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={{
                    width: columnWidth,
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    textAlign: 'right',
                    fontSize: 12,
                    paddingRight: 5,
                  }}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </View>
          )}
        </CellValue>
      </View>
    </ListItem>
  );
});

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
            ? trackingBudget.groupBudgeted(group.id)
            : envelopeBudget.groupBudgeted(group.id)
        }
        spent={
          type === 'report'
            ? trackingBudget.groupSumAmount(group.id)
            : envelopeBudget.groupSumAmount(group.id)
        }
        balance={
          type === 'report'
            ? trackingBudget.groupBalance(group.id)
            : envelopeBudget.groupBalance(group.id)
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
                  ? trackingBudget.catGoal(category.id)
                  : envelopeBudget.catGoal(category.id)
              }
              longGoal={
                type === 'report'
                  ? trackingBudget.catLongGoal(category.id)
                  : envelopeBudget.catLongGoal(category.id)
              }
              budgeted={
                type === 'report'
                  ? trackingBudget.catBudgeted(category.id)
                  : envelopeBudget.catBudgeted(category.id)
              }
              spent={
                type === 'report'
                  ? trackingBudget.catSumAmount(category.id)
                  : envelopeBudget.catSumAmount(category.id)
              }
              balance={
                type === 'report'
                  ? trackingBudget.catBalance(category.id)
                  : envelopeBudget.catBalance(category.id)
              }
              carryover={
                type === 'report'
                  ? trackingBudget.catCarryover(category.id)
                  : envelopeBudget.catCarryover(category.id)
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
  const columnWidth = getColumnWidth();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: 50,
          marginBottom: 5,
          marginRight: 15,
        }}
      >
        {type === 'report' && (
          <Label title="Budgeted" style={{ width: columnWidth }} />
        )}
        <Label title="Received" style={{ width: columnWidth }} />
      </View>

      <Card style={{ marginTop: 0 }}>
        <IncomeGroupHeader
          group={group}
          budgeted={
            type === 'report' ? trackingBudget.groupBudgeted(group.id) : null
          }
          balance={
            type === 'report'
              ? trackingBudget.groupSumAmount(group.id)
              : envelopeBudget.groupSumAmount(group.id)
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
                    ? trackingBudget.catBudgeted(category.id)
                    : null
                }
                balance={
                  type === 'report'
                    ? trackingBudget.catSumAmount(category.id)
                    : envelopeBudget.catSumAmount(category.id)
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

function UncategorizedButton() {
  const count = useSheetValue(uncategorizedCount());
  if (count === null || count <= 0) {
    return null;
  }

  return (
    <View
      style={{
        padding: 5,
        paddingBottom: 2,
      }}
    >
      <Link
        variant="button"
        type="button"
        buttonVariant="primary"
        to="/accounts/uncategorized"
        style={{
          border: 0,
          justifyContent: 'flex-start',
          padding: '1.25em',
        }}
      >
        {count} uncategorized {count === 1 ? 'transaction' : 'transactions'}
        <View style={{ flex: 1 }} />
        <SvgArrowThinRight width="15" height="15" />
      </Link>
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

  const [showSpentColumn = false, setShowSpentColumnPref] = useLocalPref(
    'mobile.showSpentColumn',
  );

  function toggleSpentColumn() {
    setShowSpentColumnPref(!showSpentColumn);
  }

  const [showHiddenCategories = false] = useLocalPref(
    'budget.showHiddenCategories',
  );

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
              variant="bare"
              style={{ margin: 10 }}
              onPress={onOpenBudgetPageMenu}
              aria-label="Budget page menu"
            >
              <SvgLogo
                style={{ color: theme.mobileHeaderText }}
                width="20"
                height="20"
              />
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
      <BudgetTableHeader
        type={type}
        month={month}
        show3Cols={show3Cols}
        showSpentColumn={showSpentColumn}
        toggleSpentColumn={toggleSpentColumn}
        onShowBudgetSummary={onShowBudgetSummary}
      />
      <PullToRefresh onRefresh={onRefresh}>
        <View
          data-testid="budget-table"
          style={{
            backgroundColor: theme.pageBackground,
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
        >
          <UncategorizedButton />
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

function BudgetTableHeader({
  show3Cols,
  type,
  month,
  onShowBudgetSummary,
  showSpentColumn,
  toggleSpentColumn,
}) {
  const format = useFormat();
  const buttonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 'unset',
  };
  const sidebarColumnWidth = getColumnWidth({ show3Cols, isSidebar: true });
  const columnWidth = getColumnWidth({ show3Cols });

  const amountStyle = {
    color: theme.formInputText,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '500',
  };

  return (
    <View
      data-testid="budget-table-header"
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        padding: '10px 15px',
        paddingLeft: 10,
        backgroundColor: theme.tableRowHeaderBackground,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <View
        style={{
          width: sidebarColumnWidth,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        {type === 'report' ? (
          <Saved
            projected={month >= monthUtils.currentMonth()}
            onPress={onShowBudgetSummary}
            show3Cols={show3Cols}
          />
        ) : (
          <ToBudget
            toBudget={envelopeBudget.toBudget}
            onPress={onShowBudgetSummary}
            show3Cols={show3Cols}
          />
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {(show3Cols || !showSpentColumn) && (
          <CellValue
            binding={
              type === 'report'
                ? trackingBudget.totalBudgetedExpense
                : envelopeBudget.totalBudgeted
            }
            type="financial"
          >
            {({ type, value }) => (
              <Button
                variant="bare"
                isDisabled={show3Cols}
                onPress={toggleSpentColumn}
                style={{
                  ...buttonStyle,
                  width: columnWidth,
                }}
              >
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!show3Cols && (
                      <SvgViewShow
                        width={12}
                        height={12}
                        style={{
                          flexShrink: 0,
                          color: theme.pageTextSubdued,
                          marginRight: 5,
                        }}
                      />
                    )}
                    <Label
                      title="Budgeted"
                      style={{ color: theme.formInputText, paddingRight: 4 }}
                    />
                  </View>
                  <View>
                    <PrivacyFilter>
                      <AutoTextSize
                        key={value}
                        as={Text}
                        minFontSizePx={6}
                        maxFontSizePx={12}
                        mode="oneline"
                        style={{
                          ...amountStyle,
                          paddingRight: 4,
                        }}
                      >
                        {format(value, type)}
                      </AutoTextSize>
                    </PrivacyFilter>
                  </View>
                </View>
              </Button>
            )}
          </CellValue>
        )}
        {(show3Cols || showSpentColumn) && (
          <CellValue
            binding={
              type === 'report'
                ? trackingBudget.totalSpent
                : envelopeBudget.totalSpent
            }
            type="financial"
          >
            {({ type, value }) => (
              <Button
                variant="bare"
                isDisabled={show3Cols}
                onPress={toggleSpentColumn}
                style={{
                  ...buttonStyle,
                  width: columnWidth,
                }}
              >
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!show3Cols && (
                      <SvgViewShow
                        width={12}
                        height={12}
                        style={{
                          flexShrink: 0,
                          color: theme.pageTextSubdued,
                          marginRight: 5,
                        }}
                      />
                    )}
                    <Label
                      title="Spent"
                      style={{ color: theme.formInputText, paddingRight: 4 }}
                    />
                  </View>
                  <View>
                    <PrivacyFilter>
                      <AutoTextSize
                        key={value}
                        as={Text}
                        minFontSizePx={6}
                        maxFontSizePx={12}
                        mode="oneline"
                        style={{
                          ...amountStyle,
                          paddingRight: 4,
                        }}
                      >
                        {format(value, type)}
                      </AutoTextSize>
                    </PrivacyFilter>
                  </View>
                </View>
              </Button>
            )}
          </CellValue>
        )}
        <CellValue
          binding={
            type === 'report'
              ? trackingBudget.totalLeftover
              : envelopeBudget.totalBalance
          }
          type="financial"
        >
          {({ type, value }) => (
            <View style={{ width: columnWidth }}>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Label title="Balance" style={{ color: theme.formInputText }} />
                <View>
                  <PrivacyFilter>
                    <AutoTextSize
                      key={value}
                      as={Text}
                      minFontSizePx={6}
                      maxFontSizePx={12}
                      mode="oneline"
                      style={{
                        ...amountStyle,
                      }}
                    >
                      {format(value, type)}
                    </AutoTextSize>
                  </PrivacyFilter>
                </View>
              </View>
            </View>
          )}
        </CellValue>
      </View>
    </View>
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
        aria-label="Previous month"
        variant="bare"
        onPress={() => {
          if (prevEnabled) {
            onPrevMonth();
          }
        }}
        style={{ ...arrowButtonStyle, opacity: prevEnabled ? 1 : 0.6 }}
      >
        <SvgArrowThinLeft width="15" height="15" style={{ margin: -5 }} />
      </Button>
      <Button
        variant="bare"
        style={{
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 500,
          margin: '0 5px',
        }}
        onPress={() => {
          onOpenMonthMenu?.(month);
        }}
        data-month={month}
      >
        <Text style={styles.underlinedText}>
          {monthUtils.format(month, 'MMMM ‘yy')}
        </Text>
      </Button>
      <Button
        aria-label="Next month"
        variant="bare"
        onPress={() => {
          if (nextEnabled) {
            onNextMonth();
          }
        }}
        style={{ ...arrowButtonStyle, opacity: nextEnabled ? 1 : 0.6 }}
      >
        <SvgArrowThinRight width="15" height="15" style={{ margin: -5 }} />
      </Button>
    </View>
  );
}
