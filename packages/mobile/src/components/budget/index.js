import React, { useContext } from 'react';
import { View, Text, Animated, RefreshControl } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connectActionSheet } from '@expo/react-native-action-sheet';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import * as actions from 'loot-core/src/client/actions';
import * as monthUtils from 'loot-core/src/shared/months';
import NamespaceContext from 'loot-design/src/components/spreadsheet/NamespaceContext';
import SpreadsheetContext from 'loot-design/src/components/spreadsheet/SpreadsheetContext';
import FocusAwareStatusBar from 'loot-design/src/components/mobile/FocusAwareStatusBar';
import { colors, styles } from 'loot-design/src/style';
import SheetValue from 'loot-design/src/components/spreadsheet/SheetValue';
import CellValue from 'loot-design/src/components/spreadsheet/CellValue';
import format from 'loot-design/src/components/spreadsheet/format';
import { BudgetTable } from 'loot-design/src/components/mobile/budget';
import AnimatedLoading from 'loot-design/src/svg/v1/AnimatedLoading';
import { Button } from 'loot-design/src/components/mobile/common';
import SyncRefresh from '../SyncRefresh';
import Modal from '../modals/Modal';
import { rolloverBudget } from 'loot-core/src/client/queries';

import {
  addCategory,
  moveCategory,
  moveCategoryGroup
} from 'loot-core/src/shared/categories.js';

function BudgetSummary({ month, onClose }) {
  const prevMonthName = monthUtils.format(monthUtils.prevMonth(month), 'MMM');

  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
      <View
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      >
        <Modal title="Budget Details" animate>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              paddingVertical: 15
            }}
          >
            <Text
              style={[
                styles.text,
                {
                  fontWeight: '600',
                  textAlign: 'right',
                  marginRight: 10,
                  lineHeight: 23
                }
              ]}
            >
              <CellValue
                binding={rolloverBudget.incomeAvailable}
                type="financial"
              />
              {'\n'}
              <CellValue
                binding={rolloverBudget.lastMonthOverspent}
                type="financial"
              />
              {'\n'}
              <CellValue
                binding={rolloverBudget.totalBudgeted}
                type="financial"
              />
              {'\n'}
              <CellValue
                binding={rolloverBudget.forNextMonth}
                type="financial"
              />
            </Text>

            <Text style={[styles.text, { textAlign: 'left', lineHeight: 23 }]}>
              <Text>Available Funds</Text>
              {'\n'}
              <Text>Overspent in {prevMonthName}</Text>
              {'\n'}
              <Text>Budgeted</Text>
              {'\n'}
              <Text>For Next Month</Text>
            </Text>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 15 }}>
            <SheetValue binding={rolloverBudget.toBudget}>
              {({ value: amount }) => {
                return (
                  <>
                    <Text style={styles.text}>
                      {amount < 0 ? 'Overbudget:' : 'To budget:'}
                    </Text>
                    <Text
                      style={[
                        styles.text,
                        {
                          fontWeight: '600',
                          fontSize: 22,
                          color: amount < 0 ? colors.r4 : colors.n1
                        }
                      ]}
                    >
                      {format(amount, 'financial')}
                    </Text>
                  </>
                );
              }}
            </SheetValue>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              paddingBottom: 15
            }}
          >
            <Button style={{ marginRight: 10 }} onPress={onClose}>
              Close
            </Button>
          </View>
        </Modal>
      </View>
    </NamespaceContext.Provider>
  );
}

class Budget extends React.Component {
  constructor(props) {
    super(props);

    this.summary = new Animated.Value(0);

    const currentMonth = monthUtils.currentMonth();
    this.state = {
      bounds: { start: currentMonth, end: currentMonth },
      currentMonth: currentMonth,
      initialized: false,
      editMode: false,
      categoryGroups: null,
      showBudgetDetails: false
    };
  }

  async loadCategories() {
    let result = await this.props.getCategories();
    this.setState({ categoryGroups: result.grouped });
  }

  async componentDidMount() {
    let removeBlur = this.props.navigation.addListener('didBlur', () => {
      this.setState({ editMode: false });
    });

    this.loadCategories();

    const { start, end } = await send('get-budget-bounds');
    this.setState({ bounds: { start, end } });

    this.prewarmMonth(this.state.currentMonth);

    let unlisten = listen('sync-event', ({ type, tables }) => {
      if (
        type === 'success' &&
        (tables.includes('categories') ||
          tables.includes('category_mapping') ||
          tables.includes('category_groups'))
      ) {
        // TODO: is this loading every time?
        this.loadCategories();
      }
    });

    this.cleanup = () => {
      removeBlur();
      unlisten();
    };
  }

  componentWillUnmount() {
    // this.cleanup();
  }

  prewarmMonth = async (month, type = null) => {
    type = type || this.props.budgetType;

    let method =
      type === 'report' ? 'report-budget-month' : 'rollover-budget-month';

    let values = await send(method, { month });

    for (let value of values) {
      this.props.spreadsheet.prewarmCache(value.name, value);
    }

    if (!this.state.initialized) {
      this.setState({ initialized: true });
    }
  };

  onShowBudgetDetails = () => {
    this.setState({ showBudgetDetails: true });
  };

  onBudgetAction = type => {
    const { currentMonth } = this.state;
    this.props.applyBudgetAction(currentMonth, type, this.state.bounds);
  };

  onAddCategory = groupId => {
    this.props.navigation.navigate('AddCategoryModal', {
      groupId,
      onAdd: async name => {
        let id = await this.props.createCategory(name, groupId);
        let { categoryGroups } = this.state;

        this.setState({
          categoryGroups: addCategory(categoryGroups, {
            name,
            cat_group: groupId,
            is_income: 0,
            id
          })
        });
      }
    });
  };

  onReorderCategory = (id, { inGroup, aroundCategory }) => {
    let { categoryGroups } = this.state;
    let groupId, targetId;

    if (inGroup) {
      groupId = inGroup;
    } else if (aroundCategory) {
      let { id: catId, position } = aroundCategory;

      let group = categoryGroups.find(group =>
        group.categories.find(cat => cat.id === catId)
      );

      if (position === 'bottom') {
        let { categories } = group;
        let idx = categories.findIndex(cat => cat.id === catId);
        catId = idx < categories.length - 1 ? categories[idx + 1].id : null;
      }

      groupId = group.id;
      targetId = catId;
    }

    this.props.moveCategory(id, groupId, targetId);

    this.setState({
      categoryGroups: moveCategory(categoryGroups, id, groupId, targetId)
    });
  };

  onReorderGroup = (id, targetId, position) => {
    let { categoryGroups } = this.state;

    if (position === 'bottom') {
      let idx = categoryGroups.findIndex(group => group.id === targetId);
      targetId =
        idx < categoryGroups.length - 1 ? categoryGroups[idx + 1].id : null;
    }

    this.props.moveCategoryGroup(id, targetId);

    this.setState({
      categoryGroups: moveCategoryGroup(categoryGroups, id, targetId)
    });
  };

  sync = async () => {
    const { updated, error } = await this.props.sync();
    if (error) {
      return 'error';
    } else if (updated) {
      return 'updated';
    }
    return null;
  };

  onPrevMonth = async () => {
    let month = monthUtils.subMonths(this.state.currentMonth, 1);
    await this.prewarmMonth(month);
    this.setState({ currentMonth: month });
  };

  onNextMonth = async () => {
    let month = monthUtils.addMonths(this.state.currentMonth, 1);
    await this.prewarmMonth(month);
    this.setState({ currentMonth: month });
  };

  onOpenActionSheet = () => {
    let { budgetType } = this.props;

    let options = [
      'Edit Categories',
      "Copy last month's budget",
      'Set budgets to zero',
      'Set budgets to 3 month average',
      budgetType === 'report' && 'Apply to all future budgets',
      'Cancel'
    ].filter(Boolean);

    this.props.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title: 'Actions'
      },
      idx => {
        switch (idx) {
          case 0:
            this.setState({ editMode: true });
            break;
          case 1:
            this.onBudgetAction('copy-last');
            break;
          case 2:
            this.onBudgetAction('set-zero');
            break;
          case 3:
            this.onBudgetAction('set-3-avg');
            break;
          default:
        }
      }
    );
  };

  render() {
    const {
      currentMonth,
      bounds,
      editMode,
      initialized,
      showBudgetDetails
    } = this.state;
    const {
      categories,
      categoryGroups,
      prefs,
      budgetType,
      navigation,
      applyBudgetAction
    } = this.props;
    let numberFormat = prefs.numberFormat || 'comma-dot';

    if (!categoryGroups || !initialized) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <AnimatedLoading width={25} height={25} />
        </View>
      );
    }

    return (
      <SafeAreaView
        edges={['top']}
        style={{ flex: 1, backgroundColor: colors.p5 }}
      >
        <FocusAwareStatusBar barStyle="light-content" />
        <SyncRefresh onSync={this.sync}>
          {({ refreshing, onRefresh }) => (
            <BudgetTable
              // This key forces the whole table rerender when the number
              // format changes
              key={numberFormat}
              categories={categories}
              categoryGroups={categoryGroups}
              type={budgetType}
              month={currentMonth}
              monthBounds={bounds}
              editMode={editMode}
              navigation={navigation}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              onEditMode={flag => this.setState({ editMode: flag })}
              onShowBudgetDetails={this.onShowBudgetDetails}
              onPrevMonth={this.onPrevMonth}
              onNextMonth={this.onNextMonth}
              onAddCategory={this.onAddCategory}
              onReorderCategory={this.onReorderCategory}
              onReorderGroup={this.onReorderGroup}
              onOpenActionSheet={this.onOpenActionSheet}
              onBudgetAction={applyBudgetAction}
            />
          )}
        </SyncRefresh>

        {showBudgetDetails && (
          <BudgetSummary
            month={currentMonth}
            onClose={() => this.setState({ showBudgetDetails: false })}
          />
        )}
      </SafeAreaView>
    );
  }
}

function BudgetWrapper(props) {
  let spreadsheet = useContext(SpreadsheetContext);
  return <Budget {...props} spreadsheet={spreadsheet} />;
}

export default connect(
  state => ({
    categoryGroups: state.queries.categories.grouped,
    categories: state.queries.categories.list,
    budgetType: state.prefs.local.budgetType || 'rollover',
    prefs: state.prefs.local,
    initialBudgetMonth: state.app.budgetMonth
  }),
  dispatch => bindActionCreators(actions, dispatch)
)(connectActionSheet(BudgetWrapper));
