import React, {
  createRef,
  memo,
  Component,
  useContext,
  useState,
  useMemo,
} from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import ExpandArrow from '../../icons/v0/ExpandArrow';
import CheveronDown from '../../icons/v1/CheveronDown';
import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';
import { styles, colors } from '../../style';
import Button from '../common/Button';
import Menu from '../common/Menu';
import Text from '../common/Text';
import View from '../common/View';
import NotesButton from '../NotesButton';
import {
  useDraggable,
  useDroppable,
  DropHighlight,
  DropHighlightPosContext,
} from '../sort';
import NamespaceContext from '../spreadsheet/NamespaceContext';
import { Row, InputCell, ROW_HEIGHT } from '../table';
import { Tooltip, IntersectionBoundary } from '../tooltips';

import BudgetSummaries from './BudgetSummaries';
import { INCOME_HEADER_HEIGHT, MONTH_BOX_SHADOW } from './constants';
import { MonthPicker } from './MonthPicker';
import { MonthsProvider, MonthsContext } from './MonthsContext';
import { separateGroups, findSortDown, findSortUp } from './util';

function getScrollbarWidth() {
  return Math.max(styles.scrollbarWidth - 2, 0);
}

export class BudgetTable extends Component {
  constructor(props) {
    super(props);
    this.budgetCategoriesRef = createRef();

    this.state = {
      editing: null,
      draggingState: null,
      showHiddenCategories: props.prefs['budget.showHiddenCategories'] ?? false,
    };
  }

  onEditMonth = (id, monthIndex) => {
    this.setState({ editing: id ? { id, cell: monthIndex } : null });
  };

  onEditName = id => {
    this.setState({ editing: id ? { id, cell: 'name' } : null });
  };

  onReorderCategory = (id, dropPos, targetId) => {
    let { categoryGroups } = this.props;

    let isGroup = !!categoryGroups.find(g => g.id === targetId);

    if (isGroup) {
      let { targetId: groupId } = findSortUp(categoryGroups, dropPos, targetId);
      let group = categoryGroups.find(g => g.id === groupId);

      if (group) {
        let { categories } = group;
        this.props.onReorderCategory({
          id,
          groupId: group.id,
          targetId:
            categories.length === 0 || dropPos === 'top'
              ? null
              : categories[0].id,
        });
      }
    } else {
      let targetGroup;

      for (let group of categoryGroups) {
        if (group.categories.find(cat => cat.id === targetId)) {
          targetGroup = group;
          break;
        }
      }

      this.props.onReorderCategory({
        id,
        groupId: targetGroup.id,
        ...findSortDown(targetGroup.categories, dropPos, targetId),
      });
    }
  };

  onReorderGroup = (id, dropPos, targetId) => {
    let { categoryGroups } = this.props;

    this.props.onReorderGroup({
      id,
      ...findSortDown(categoryGroups, dropPos, targetId),
    });
  };

  moveVertically = dir => {
    let { editing } = this.state;
    let { type, categoryGroups, collapsed } = this.props;

    const flattened = categoryGroups.reduce((all, group) => {
      if (collapsed.includes(group.id)) {
        return all.concat({ id: group.id, isGroup: true });
      }
      return all.concat([{ id: group.id, isGroup: true }, ...group.categories]);
    }, []);

    if (editing) {
      const idx = flattened.findIndex(item => item.id === editing.id);
      let nextIdx = idx + dir;

      while (nextIdx >= 0 && nextIdx < flattened.length) {
        const next = flattened[nextIdx];

        if (next.isGroup) {
          nextIdx += dir;
          continue;
        } else if (type === 'report' || !next.is_income) {
          this.onEditMonth(next.id, editing.cell);
          return;
        } else {
          break;
        }
      }
    }
  };

  onKeyDown = e => {
    if (!this.state.editing) {
      return null;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      this.moveVertically(e.shiftKey ? -1 : 1);
    }
  };

  onShowActivity = (catName, catId, monthIndex) => {
    this.props.onShowActivity(catName, catId, this.resolveMonth(monthIndex));
  };

  onBudgetAction = (monthIndex, type, args) => {
    this.props.onBudgetAction(this.resolveMonth(monthIndex), type, args);
  };

  resolveMonth = monthIndex => {
    return monthUtils.addMonths(this.props.startMonth, monthIndex);
  };

  clearEditing() {
    this.setState({ editing: null });
  }

  toggleHiddenCategories = () => {
    this.setState(prevState => ({
      showHiddenCategories: !prevState.showHiddenCategories,
    }));
    this.props.savePrefs({
      'budget.showHiddenCategories': !this.state.showHiddenCategories,
    });
  };

  expandAllCategories = () => {
    this.props.setCollapsed([]);
  };

  collapseAllCategories = () => {
    let { setCollapsed, categoryGroups } = this.props;
    setCollapsed(categoryGroups.map(g => g.id));
  };

  render() {
    let {
      type,
      categoryGroups,
      prewarmStartMonth,
      startMonth,
      numMonths,
      monthBounds,
      collapsed,
      setCollapsed,
      newCategoryForGroup,
      dataComponents,
      isAddingGroup,
      onSaveCategory,
      onSaveGroup,
      onDeleteCategory,
      onDeleteGroup,
      onShowNewCategory,
      onHideNewCategory,
      onShowNewGroup,
      onHideNewGroup,
    } = this.props;
    let { editing, draggingState, showHiddenCategories } = this.state;

    return (
      <View
        data-testid="budget-table"
        style={[
          { flex: 1 },
          styles.lightScrollbar && {
            '& ::-webkit-scrollbar': {
              backgroundColor: 'transparent',
            },
            '& ::-webkit-scrollbar-thumb:vertical': {
              backgroundColor: 'white',
            },
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            overflow: 'hidden',
            flexShrink: 0,
            // This is necessary to align with the table because the
            // table has this padding to allow the shadow to show
            paddingLeft: 5,
            paddingRight: 5 + getScrollbarWidth(),
          }}
        >
          <View style={{ width: 200 }} />
          <MonthsProvider
            startMonth={prewarmStartMonth}
            numMonths={numMonths}
            monthBounds={monthBounds}
            type={type}
          >
            <BudgetSummaries
              SummaryComponent={dataComponents.SummaryComponent}
            />
          </MonthsProvider>
        </View>

        <MonthsProvider
          startMonth={startMonth}
          numMonths={numMonths}
          monthBounds={monthBounds}
          type={type}
        >
          <BudgetTotals
            MonthComponent={dataComponents.BudgetTotalsComponent}
            toggleHiddenCategories={this.toggleHiddenCategories}
            expandAllCategories={this.expandAllCategories}
            collapseAllCategories={this.collapseAllCategories}
          />
          <IntersectionBoundary.Provider value={this.budgetCategoriesRef}>
            <View
              style={{
                overflowY: 'scroll',
                overflowAnchor: 'none',
                flex: 1,
                paddingLeft: 5,
                paddingRight: 5,
              }}
              innerRef={this.budgetCategoriesRef}
            >
              <View
                style={{
                  opacity: draggingState ? 0.5 : 1,
                  flexShrink: 0,
                }}
                onKeyDown={this.onKeyDown}
                innerRef={el => (this.budgetDataNode = el)}
              >
                <BudgetCategories
                  showHiddenCategories={showHiddenCategories}
                  categoryGroups={categoryGroups}
                  newCategoryForGroup={newCategoryForGroup}
                  isAddingGroup={isAddingGroup}
                  editingCell={editing}
                  collapsed={collapsed}
                  setCollapsed={setCollapsed}
                  dataComponents={dataComponents}
                  onEditMonth={this.onEditMonth}
                  onEditName={this.onEditName}
                  onSaveCategory={onSaveCategory}
                  onSaveGroup={onSaveGroup}
                  onDeleteCategory={onDeleteCategory}
                  onDeleteGroup={onDeleteGroup}
                  onReorderCategory={this.onReorderCategory}
                  onReorderGroup={this.onReorderGroup}
                  onShowNewCategory={onShowNewCategory}
                  onHideNewCategory={onHideNewCategory}
                  onShowNewGroup={onShowNewGroup}
                  onHideNewGroup={onHideNewGroup}
                  onBudgetAction={this.onBudgetAction}
                  onShowActivity={this.onShowActivity}
                />
              </View>
            </View>
          </IntersectionBoundary.Provider>
        </MonthsProvider>
      </View>
    );
  }
}

function SidebarCategory({
  innerRef,
  category,
  dragPreview,
  dragging,
  editing,
  style,
  borderColor = colors.border,
  isLast,
  onDragChange,
  onEditMonth,
  onEditName,
  onSave,
  onDelete,
  onHideNewCategory,
}) {
  const temporary = category.id === 'new';
  const [menuOpen, setMenuOpen] = useState(false);

  const displayed = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: category.hidden ? 0.33 : undefined,
      }}
    >
      <div
        data-testid="category-name"
        style={{
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {category.name}
      </div>
      <View style={{ flexShrink: 0, marginLeft: 5 }}>
        <Button
          type="bare"
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
          style={{ color: 'currentColor', padding: 3 }}
        >
          <CheveronDown
            width={14}
            height={14}
            style={{ color: 'currentColor' }}
          />
        </Button>
        {menuOpen && (
          <Tooltip
            position="bottom-left"
            width={200}
            style={{ padding: 0 }}
            onClose={() => setMenuOpen(false)}
          >
            <Menu
              onMenuSelect={type => {
                if (type === 'rename') {
                  onEditName(category.id);
                } else if (type === 'delete') {
                  onDelete(category.id);
                } else if (type === 'toggleVisibility') {
                  onSave({ ...category, hidden: !category.hidden });
                }
                setMenuOpen(false);
              }}
              items={[
                {
                  name: 'toggleVisibility',
                  text: category.hidden ? 'Show' : 'Hide',
                },
                { name: 'rename', text: 'Rename' },
                { name: 'delete', text: 'Delete' },
              ]}
            />
          </Tooltip>
        )}
      </View>
      <View style={{ flex: 1 }} />
      <NotesButton
        id={category.id}
        style={dragging && { color: 'currentColor' }}
      />
    </View>
  );

  return (
    <View
      innerRef={innerRef}
      style={[
        {
          width: 200,
          '& button': { display: 'none' },
        },
        !dragging &&
          !dragPreview && {
            '&:hover button': { display: 'flex', color: colors.n1 },
          },
        dragging && { color: colors.n8 },

        // The zIndex here forces the the view on top of a row below
        // it that may be "collapsed" and show a border on top
        dragPreview && {
          backgroundColor: 'white',
          zIndex: 10000,
          borderRadius: 6,
          overflow: 'hidden',
        },
        style,
      ]}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          onEditName(null);
          e.stopPropagation();
        }
      }}
    >
      <InputCell
        value={category.name}
        formatter={value => displayed}
        width="flex"
        exposed={editing || temporary}
        borderColor={dragPreview ? 'transparent' : borderColor}
        onUpdate={value => {
          if (temporary) {
            if (value === '') {
              onHideNewCategory();
            } else if (value !== '') {
              onSave({ ...category, name: value });
            }
          } else {
            if (value !== category.name) {
              onSave({ ...category, name: value });
            }
          }
        }}
        onBlur={() => onEditName(null)}
        style={[{ paddingLeft: 13 }, isLast && { borderBottomWidth: 0 }]}
        inputProps={{
          placeholder: temporary ? 'New Category Name' : '',
        }}
      />
    </View>
  );
}

function SidebarGroup({
  group,
  editing,
  collapsed,
  dragPreview,
  innerRef,
  style,
  borderColor = colors.border,
  onEdit,
  onSave,
  onDelete,
  onShowNewCategory,
  onHideNewGroup,
  onToggleCollapse,
}) {
  const temporary = group.id === 'new';
  const [menuOpen, setMenuOpen] = useState(false);

  const displayed = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onClick={e => {
        onToggleCollapse(group.id);
      }}
    >
      {!dragPreview && (
        <ExpandArrow
          width={8}
          height={8}
          style={{
            marginRight: 5,
            marginLeft: 5,
            flexShrink: 0,
            transition: 'transform .1s',
            transform: collapsed ? 'rotate(-90deg)' : '',
          }}
        />
      )}
      <div
        style={{
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {dragPreview && <Text style={{ fontWeight: 500 }}>Group: </Text>}
        {group.name}
      </div>
      {!dragPreview && (
        <>
          <View style={{ marginLeft: 5, flexShrink: 0 }}>
            <Button
              type="bare"
              onClick={e => {
                e.stopPropagation();
                setMenuOpen(true);
              }}
              style={{ padding: 3 }}
            >
              <CheveronDown width={14} height={14} />
            </Button>
            {menuOpen && (
              <Tooltip
                position="bottom-left"
                width={200}
                style={{ padding: 0 }}
                onClose={() => setMenuOpen(false)}
              >
                <Menu
                  onMenuSelect={type => {
                    if (type === 'rename') {
                      onEdit(group.id);
                    } else if (type === 'add-category') {
                      onShowNewCategory(group.id);
                    } else if (type === 'delete') {
                      onDelete(group.id);
                    } else if (type === 'toggleVisibility') {
                      onSave({ ...group, hidden: !group.hidden });
                    }
                    setMenuOpen(false);
                  }}
                  items={[
                    { name: 'add-category', text: 'Add category' },
                    {
                      name: 'toggleVisibility',
                      text: group.hidden ? 'Show' : 'Hide',
                    },
                    { name: 'rename', text: 'Rename' },
                    onDelete && { name: 'delete', text: 'Delete' },
                  ]}
                />
              </Tooltip>
            )}
          </View>
          <View style={{ flex: 1 }} />
          <NotesButton id={group.id} />
        </>
      )}
    </View>
  );

  return (
    <View
      innerRef={innerRef}
      style={[
        style,
        {
          width: 200,
          backgroundColor: colors.n11,
          '& button': { display: 'none' },
          '&:hover button': { display: 'flex', color: colors.n1 },
        },
        dragPreview && {
          paddingLeft: 10,
          zIndex: 10000,
          borderRadius: 6,
          overflow: 'hidden',
        },
      ]}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          onEdit(null);
          e.stopPropagation();
        }
      }}
    >
      <InputCell
        value={group.name}
        formatter={value => displayed}
        width="flex"
        exposed={editing}
        borderColor={colors.border}
        onUpdate={value => {
          if (temporary) {
            if (value === '') {
              onHideNewGroup();
            } else if (value !== '') {
              onSave({ id: group.id, name: value });
            }
          } else {
            onSave({ id: group.id, name: value });
          }
        }}
        onBlur={() => onEdit(null)}
        style={{ fontWeight: 600 }}
        inputProps={{
          style: { marginLeft: 20 },
          placeholder: temporary ? 'New Group Name' : '',
        }}
      />
    </View>
  );
}

function RenderMonths({ component: Component, editingIndex, args, style }) {
  let { months, type } = useContext(MonthsContext);

  return months.map((month, index) => {
    let editing = editingIndex === index;

    return (
      <NamespaceContext.Provider
        key={index}
        value={monthUtils.sheetForMonth(month, type)}
      >
        <View
          style={[
            { flex: 1 },
            { borderLeft: '1px solid ' + colors.border },
            style,
          ]}
        >
          <Component monthIndex={index} editing={editing} {...args} />
        </View>
      </NamespaceContext.Provider>
    );
  });
}

const BudgetTotals = memo(function BudgetTotals({
  MonthComponent,
  toggleHiddenCategories,
  expandAllCategories,
  collapseAllCategories,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <View
      data-testid="budget-totals"
      style={{
        backgroundColor: 'white',
        flexDirection: 'row',
        flexShrink: 0,
        boxShadow: MONTH_BOX_SHADOW,
        marginLeft: 5,
        marginRight: 5 + getScrollbarWidth(),
        borderRadius: '4px 4px 0 0',
        borderBottom: '1px solid ' + colors.border,
      }}
    >
      <View
        style={{
          width: 200,
          color: colors.n4,
          justifyContent: 'center',
          paddingLeft: 15,
          paddingRight: 5,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <View style={{ flexGrow: '1' }}>Category</View>
        <Button
          type="bare"
          onClick={() => {
            setMenuOpen(true);
          }}
          style={{ color: 'currentColor', padding: 3 }}
        >
          <DotsHorizontalTriple
            width={15}
            height={15}
            style={{ color: colors.n5 }}
          />
          {menuOpen && (
            <Tooltip
              position="bottom-right"
              width={200}
              style={{ padding: 0 }}
              onClose={() => {
                setMenuOpen(false);
              }}
            >
              <Menu
                onMenuSelect={type => {
                  if (type === 'toggleVisibility') {
                    toggleHiddenCategories();
                  } else if (type === 'expandAllCategories') {
                    expandAllCategories();
                  } else if (type === 'collapseAllCategories') {
                    collapseAllCategories();
                  }
                  setMenuOpen(false);
                }}
                items={[
                  {
                    name: 'toggleVisibility',
                    text: 'Toggle hidden',
                  },
                  {
                    name: 'expandAllCategories',
                    text: 'Expand all',
                  },
                  {
                    name: 'collapseAllCategories',
                    text: 'Collapse all',
                  },
                ]}
              />
            </Tooltip>
          )}
        </Button>
      </View>
      <RenderMonths component={MonthComponent} />
    </View>
  );
});

function ExpenseGroup({
  group,
  collapsed,
  editingCell,
  dragState,
  itemPos,
  MonthComponent,
  onEditName,
  onSave,
  onDelete,
  onDragChange,
  onReorderGroup,
  onReorderCategory,
  onToggleCollapse,
  onShowNewCategory,
}) {
  let dragging = dragState && dragState.item === group;

  let { dragRef } = useDraggable({
    type: 'group',
    onDragChange,
    item: group,
    canDrag: editingCell === null,
  });

  let { dropRef, dropPos } = useDroppable({
    types: 'group',
    id: group.id,
    onDrop: onReorderGroup,
  });

  let { dropRef: catDropRef, dropPos: catDropPos } = useDroppable({
    types: 'category',
    id: group.id,
    onDrop: onReorderCategory,
    onLongHover: () => {
      if (collapsed) {
        onToggleCollapse(group.id);
      }
    },
  });

  return (
    <Row
      collapsed={true}
      backgroundColor={colors.n11}
      style={{
        fontWeight: 600,
        opacity: group.hidden ? 0.33 : undefined,
      }}
    >
      {dragState && !dragState.preview && dragState.type === 'group' && (
        <View
          innerRef={dropRef}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: collapsed
              ? ROW_HEIGHT - 1
              : (1 + group.categories.length) * (ROW_HEIGHT - 1) + 1,
            zIndex: 10000,
          }}
        >
          <DropHighlight pos={dropPos} offset={{ top: 1 }} />
        </View>
      )}

      <DropHighlight pos={catDropPos} offset={{ top: 1 }} />

      <View
        innerRef={catDropRef}
        style={{
          flex: 1,
          flexDirection: 'row',
          opacity: dragging && !dragState.preview ? 0.3 : 1,
        }}
      >
        <SidebarGroup
          innerRef={dragRef}
          group={group}
          editing={
            editingCell &&
            editingCell.cell === 'name' &&
            editingCell.id === group.id
          }
          dragPreview={dragging && dragState.preview}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onEdit={onEditName}
          onSave={onSave}
          onDelete={onDelete}
          onShowNewCategory={onShowNewCategory}
        />
        <RenderMonths component={MonthComponent} args={{ group }} />
      </View>
    </Row>
  );
}

function ExpenseCategory({
  cat,
  budgetArray,
  editingCell,
  dragState,
  MonthComponent,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onBudgetAction,
  onShowActivity,
  onDragChange,
  onReorder,
}) {
  let dragging = dragState && dragState.item === cat;

  if (dragState && dragState.item.id === cat.cat_group) {
    dragging = true;
  }

  let { dragRef } = useDraggable({
    type: 'category',
    onDragChange,
    item: cat,
    canDrag: editingCell === null,
  });

  let { dropRef, dropPos } = useDroppable({
    types: 'category',
    id: cat.id,
    onDrop: onReorder,
  });

  return (
    <Row
      innerRef={dropRef}
      collapsed={true}
      style={{
        backgroundColor: 'transparent',
        opacity: cat.hidden ? 0.5 : undefined,
      }}
    >
      <DropHighlight pos={dropPos} offset={{ top: 1 }} />

      <View
        style={[
          {
            flex: 1,
            flexDirection: 'row',
          },
        ]}
      >
        <SidebarCategory
          innerRef={dragRef}
          category={cat}
          dragPreview={dragging && dragState.preview}
          dragging={dragging && !dragState.preview}
          editing={
            editingCell &&
            editingCell.cell === 'name' &&
            editingCell.id === cat.id
          }
          onEditName={onEditName}
          onSave={onSave}
          onDelete={onDelete}
          onDragChange={onDragChange}
        />

        <RenderMonths
          component={MonthComponent}
          editingIndex={
            editingCell && editingCell.id === cat.id && editingCell.cell
          }
          args={{
            category: cat,
            onEdit: onEditMonth,
            onBudgetAction,
            onShowActivity,
          }}
        />
      </View>
    </Row>
  );
}

function IncomeGroup({
  group,
  editingCell,
  collapsed,
  MonthComponent,
  onEditName,
  onSave,
  onToggleCollapse,
  onShowNewCategory,
}) {
  return (
    <Row
      collapsed={true}
      backgroundColor={colors.n11}
      style={{ fontWeight: 600 }}
    >
      <SidebarGroup
        group={group}
        collapsed={collapsed}
        editing={
          editingCell &&
          editingCell.cell === 'name' &&
          editingCell.id === group.id
        }
        onEdit={onEditName}
        onSave={onSave}
        onToggleCollapse={onToggleCollapse}
        onShowNewCategory={onShowNewCategory}
      />
      <RenderMonths component={MonthComponent} args={{ group }} />
    </Row>
  );
}

function IncomeCategory({
  cat,
  isLast,
  editingCell,
  MonthComponent,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onDragChange,
  onBudgetAction,
  onReorder,
  onShowActivity,
}) {
  let { dragRef } = useDraggable({
    type: 'income-category',
    onDragChange,
    item: cat,
    canDrag: editingCell === null,
  });

  let { dropRef, dropPos } = useDroppable({
    types: 'income-category',
    id: cat.id,
    onDrop: onReorder,
  });

  return (
    <Row innerRef={dropRef} collapsed={true} backgroundColor="transparent">
      <DropHighlight pos={dropPos} offset={{ top: 1 }} />

      <SidebarCategory
        innerRef={dragRef}
        category={cat}
        isLast={isLast}
        editing={
          editingCell &&
          editingCell.cell === 'name' &&
          editingCell.id === cat.id
        }
        onEditName={onEditName}
        onSave={onSave}
        onDelete={onDelete}
      />
      <RenderMonths
        component={MonthComponent}
        editingIndex={
          editingCell && editingCell.id === cat.id && editingCell.cell
        }
        args={{
          category: cat,
          onEdit: onEditMonth,
          isLast,
          onShowActivity,
          onBudgetAction,
        }}
      />
    </Row>
  );
}

const BudgetCategories = memo(
  ({
    categoryGroups,
    newCategoryForGroup,
    showHiddenCategories,
    isAddingGroup,
    editingCell,
    collapsed,
    setCollapsed,
    dataComponents,
    onBudgetAction,
    onShowActivity,
    onEditName,
    onEditMonth,
    onSaveCategory,
    onSaveGroup,
    onDeleteCategory,
    onDeleteGroup,
    onReorderCategory,
    onReorderGroup,
    onShowNewCategory,
    onHideNewCategory,
    onShowNewGroup,
    onHideNewGroup,
  }) => {
    let items = useMemo(() => {
      let [expenseGroups, incomeGroup] = separateGroups(categoryGroups);

      let items = Array.prototype.concat.apply(
        [],
        expenseGroups.map(group => {
          if (group.hidden && !showHiddenCategories) {
            return [];
          }

          const groupCategories = group.categories.filter(
            cat => showHiddenCategories || !cat.hidden,
          );

          let items = [{ type: 'expense-group', value: { ...group } }];

          if (newCategoryForGroup === group.id) {
            items.push({ type: 'new-category' });
          }

          return [
            ...items,
            ...(collapsed.includes(group.id) ? [] : groupCategories).map(
              cat => ({
                type: 'expense-category',
                value: cat,
              }),
            ),
          ];
        }),
      );

      if (isAddingGroup) {
        items.push({ type: 'new-group' });
      }

      if (incomeGroup) {
        items = items.concat(
          [
            { type: 'income-separator' },
            { type: 'income-group', value: incomeGroup },
            newCategoryForGroup === incomeGroup.id && { type: 'new-category' },
            ...(collapsed.includes(incomeGroup.id)
              ? []
              : incomeGroup.categories.filter(
                  cat => showHiddenCategories || !cat.hidden,
                )
            ).map(cat => ({
              type: 'income-category',
              value: cat,
            })),
          ].filter(x => x),
        );
      }

      return items;
    }, [
      categoryGroups,
      collapsed,
      newCategoryForGroup,
      isAddingGroup,
      showHiddenCategories,
    ]);

    let [dragState, setDragState] = useState(null);
    let [savedCollapsed, setSavedCollapsed] = useState(null);

    // TODO: If we turn this into a reducer, we could probably memoize
    // each item in the list for better perf
    function onDragChange(newDragState) {
      let { state } = newDragState;

      if (state === 'start-preview') {
        setDragState({
          type: newDragState.type,
          item: newDragState.item,
          preview: true,
        });
      } else if (state === 'start') {
        if (dragState) {
          setDragState({
            ...dragState,
            preview: false,
          });
          setSavedCollapsed(collapsed);
        }
      } else if (state === 'hover') {
        setDragState({
          ...dragState,
          hoveredId: newDragState.id,
          hoveredPos: newDragState.pos,
        });
      } else if (state === 'end') {
        setDragState(null);
        setCollapsed(savedCollapsed || []);
      }
    }

    function onToggleCollapse(id) {
      if (collapsed.includes(id)) {
        setCollapsed(collapsed.filter(id_ => id_ !== id));
      } else {
        setCollapsed([...collapsed, id]);
      }
    }

    return (
      <View
        style={{
          marginBottom: 10,
          backgroundColor: 'white',
          overflow: 'hidden',
          boxShadow: MONTH_BOX_SHADOW,
          borderRadius: '0 0 4px 4px',
          flex: 1,
        }}
      >
        {items.map((item, idx) => {
          let content;
          switch (item.type) {
            case 'new-group':
              content = (
                <Row style={{ backgroundColor: colors.n11 }}>
                  <SidebarGroup
                    group={{ id: 'new', name: '' }}
                    editing={true}
                    onSave={onSaveGroup}
                    onHideNewGroup={onHideNewGroup}
                    onEdit={onEditName}
                  />
                </Row>
              );
              break;
            case 'new-category':
              content = (
                <Row>
                  <SidebarCategory
                    category={{
                      name: '',
                      cat_group: newCategoryForGroup,
                      is_income:
                        newCategoryForGroup ===
                        categoryGroups.find(g => g.is_income).id,
                      id: 'new',
                    }}
                    editing={true}
                    onSave={onSaveCategory}
                    onHideNewCategory={onHideNewCategory}
                    onEditName={onEditName}
                  />
                </Row>
              );
              break;

            case 'expense-group':
              content = (
                <ExpenseGroup
                  group={item.value}
                  editingCell={editingCell}
                  collapsed={collapsed.includes(item.value.id)}
                  MonthComponent={dataComponents.ExpenseGroupComponent}
                  dragState={dragState}
                  onEditName={onEditName}
                  onSave={onSaveGroup}
                  onDelete={onDeleteGroup}
                  onDragChange={onDragChange}
                  onReorderGroup={onReorderGroup}
                  onReorderCategory={onReorderCategory}
                  onToggleCollapse={onToggleCollapse}
                  onShowNewCategory={onShowNewCategory}
                />
              );
              break;
            case 'expense-category':
              content = (
                <ExpenseCategory
                  cat={item.value}
                  editingCell={editingCell}
                  MonthComponent={dataComponents.ExpenseCategoryComponent}
                  dragState={dragState}
                  onEditName={onEditName}
                  onEditMonth={onEditMonth}
                  onSave={onSaveCategory}
                  onDelete={onDeleteCategory}
                  onDragChange={onDragChange}
                  onReorder={onReorderCategory}
                  onBudgetAction={onBudgetAction}
                  onShowActivity={onShowActivity}
                />
              );
              break;
            case 'income-separator':
              content = (
                <View
                  style={{
                    height: INCOME_HEADER_HEIGHT,
                    backgroundColor: 'white',
                  }}
                >
                  <IncomeHeader
                    MonthComponent={dataComponents.IncomeHeaderComponent}
                    onShowNewGroup={onShowNewGroup}
                  />
                </View>
              );
              break;
            case 'income-group':
              content = (
                <IncomeGroup
                  group={item.value}
                  editingCell={editingCell}
                  MonthComponent={dataComponents.IncomeGroupComponent}
                  collapsed={collapsed.includes(item.value.id)}
                  onEditName={onEditName}
                  onSave={onSaveGroup}
                  onToggleCollapse={onToggleCollapse}
                  onShowNewCategory={onShowNewCategory}
                />
              );
              break;
            case 'income-category':
              content = (
                <IncomeCategory
                  cat={item.value}
                  editingCell={editingCell}
                  isLast={idx === items.length - 1}
                  MonthComponent={dataComponents.IncomeCategoryComponent}
                  onEditName={onEditName}
                  onEditMonth={onEditMonth}
                  onSave={onSaveCategory}
                  onDelete={onDeleteCategory}
                  onDragChange={onDragChange}
                  onReorder={onReorderCategory}
                  onBudgetAction={onBudgetAction}
                  onShowActivity={onShowActivity}
                />
              );
              break;
            default:
              throw new Error('Unknown item type: ' + item.type);
          }

          let pos =
            idx === 0 ? 'first' : idx === items.length - 1 ? 'last' : null;

          return (
            <DropHighlightPosContext.Provider
              key={
                item.value
                  ? item.value.id
                  : item.type === 'income-separator'
                  ? 'separator'
                  : idx
              }
              value={pos}
            >
              <View
                style={
                  !dragState && {
                    ':hover': { backgroundColor: '#fcfcfc' },
                  }
                }
              >
                {content}
              </View>
            </DropHighlightPosContext.Provider>
          );
        })}
      </View>
    );
  },
);

function IncomeHeader({ MonthComponent, onShowNewGroup }) {
  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      <View
        style={{
          width: 200,
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
      >
        <Button onClick={onShowNewGroup} style={{ fontSize: 12, margin: 10 }}>
          Add Group
        </Button>
      </View>
      <RenderMonths
        component={MonthComponent}
        style={{ border: 0, justifyContent: 'flex-end' }}
      />
    </View>
  );
}

export const BudgetPageHeader = memo(
  ({ startMonth, onMonthSelect, numMonths, monthBounds, style }) => {
    function getValidMonth(month) {
      let start = monthBounds.start;
      let end = monthUtils.subMonths(monthBounds.end, numMonths - 1);

      if (month < start) {
        return start;
      } else if (month > end) {
        return end;
      }
      return month;
    }

    return (
      <View style={{ marginLeft: 200 + 5, flexShrink: 0 }}>
        <View style={{ marginRight: 5 + getScrollbarWidth() }}>
          <MonthPicker
            startMonth={startMonth}
            numDisplayed={numMonths}
            monthBounds={monthBounds}
            style={{ paddingTop: 5 }}
            onSelect={month => onMonthSelect(getValidMonth(month))}
          />
        </View>
      </View>
    );
  },
);
