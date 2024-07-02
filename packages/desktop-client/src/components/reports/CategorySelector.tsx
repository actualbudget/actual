// @ts-strict-ignore
import React, { Fragment, useMemo, useState } from 'react';

import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/src/types/models';

import {
  SvgCheckAll,
  SvgUncheckAll,
  SvgViewHide,
  SvgViewShow,
} from '../../icons/v2';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox } from '../forms';

import { GraphButton } from './GraphButton';

type CategorySelectorProps = {
  categoryGroups: Array<CategoryGroupEntity>;
  selectedCategories: CategoryEntity[];
  setSelectedCategories: (selectedCategories: CategoryEntity[]) => void;
  showHiddenCategories?: boolean;
};

export function CategorySelector({
  categoryGroups,
  selectedCategories,
  setSelectedCategories,
  showHiddenCategories = true,
}: CategorySelectorProps) {
  const [uncheckedHidden, setUncheckedHidden] = useState(false);
  const filteredGroup = (categoryGroup: CategoryGroupEntity) => {
    return categoryGroup.categories.filter(f => {
      return showHiddenCategories || !f.hidden ? true : false;
    });
  };

  const selectAll: CategoryEntity[] = [];
  categoryGroups.map(categoryGroup =>
    filteredGroup(categoryGroup).map(category => selectAll.push(category)),
  );

  if (selectedCategories === undefined) {
    selectedCategories = categoryGroups.flatMap(cg => cg.categories);
  }

  const selectedCategoryMap = useMemo(
    () => selectedCategories.map(selected => selected.id),
    [selectedCategories],
  );

  const allCategoriesSelected = selectAll.every(category =>
    selectedCategoryMap.includes(category.id),
  );

  const allCategoriesUnselected = !selectAll.some(category =>
    selectedCategoryMap.includes(category.id),
  );

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 5,
          flexShrink: 0,
        }}
      >
        <Button
          type="bare"
          onClick={() => setUncheckedHidden(state => !state)}
          style={{ padding: 8 }}
        >
          <View>
            {uncheckedHidden ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SvgViewShow
                  width={15}
                  height={15}
                  style={{ marginRight: 5 }}
                />
                <Text>Show unchecked</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SvgViewHide
                  width={15}
                  height={15}
                  style={{ marginRight: 5 }}
                />
                <Text>Hide unchecked</Text>
              </View>
            )}
          </View>
        </Button>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <GraphButton
            selected={allCategoriesSelected}
            title="Select All"
            onSelect={() => {
              setSelectedCategories(selectAll);
            }}
            style={{ marginRight: 5, padding: 8 }}
          >
            <SvgCheckAll width={15} height={15} />
          </GraphButton>
          <GraphButton
            selected={allCategoriesUnselected}
            title="Unselect All"
            onSelect={() => {
              setSelectedCategories([]);
            }}
            style={{ padding: 8 }}
          >
            <SvgUncheckAll width={15} height={15} />
          </GraphButton>
        </View>
      </View>

      <ul
        style={{
          listStyle: 'none',
          marginLeft: 0,
          paddingLeft: 0,
          paddingRight: 10,
          flexGrow: 1,
          overflowY: 'auto',
        }}
      >
        {categoryGroups &&
          categoryGroups.map(categoryGroup => {
            const allCategoriesInGroupSelected = filteredGroup(
              categoryGroup,
            ).every(category =>
              selectedCategories.some(
                selectedCategory => selectedCategory.id === category.id,
              ),
            );
            const noCategorySelected = filteredGroup(categoryGroup).every(
              category =>
                !selectedCategories.some(
                  selectedCategory => selectedCategory.id === category.id,
                ),
            );
            return (
              <Fragment key={categoryGroup.id}>
                <li
                  style={{
                    display:
                      noCategorySelected && uncheckedHidden ? 'none' : 'flex',
                    marginBottom: 8,
                    flexDirection: 'row',
                  }}
                >
                  <Checkbox
                    id={`form_${categoryGroup.id}`}
                    checked={allCategoriesInGroupSelected}
                    onChange={() => {
                      const selectedCategoriesExcludingGroupCategories =
                        selectedCategories.filter(
                          selectedCategory =>
                            !filteredGroup(categoryGroup).some(
                              groupCategory =>
                                groupCategory.id === selectedCategory.id,
                            ),
                        );
                      if (allCategoriesInGroupSelected) {
                        setSelectedCategories(
                          selectedCategoriesExcludingGroupCategories,
                        );
                      } else {
                        setSelectedCategories(
                          selectedCategoriesExcludingGroupCategories.concat(
                            filteredGroup(categoryGroup),
                          ),
                        );
                      }
                    }}
                  />
                  <label
                    htmlFor={`form_${categoryGroup.id}`}
                    style={{ userSelect: 'none', fontWeight: 'bold' }}
                  >
                    {categoryGroup.name}
                  </label>
                </li>
                <li>
                  <ul
                    style={{
                      listStyle: 'none',
                      marginLeft: 0,
                      marginBottom: 10,
                      paddingLeft: 10,
                    }}
                  >
                    {filteredGroup(categoryGroup).map(category => {
                      const isChecked = selectedCategories.some(
                        selectedCategory => selectedCategory.id === category.id,
                      );
                      return (
                        <li
                          key={category.id}
                          style={{
                            display:
                              !isChecked && uncheckedHidden ? 'none' : 'flex',
                            flexDirection: 'row',
                            marginBottom: 4,
                          }}
                        >
                          <Checkbox
                            id={`form_${category.id}`}
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedCategories(
                                  selectedCategories.filter(
                                    selectedCategory =>
                                      selectedCategory.id !== category.id,
                                  ),
                                );
                              } else {
                                setSelectedCategories([
                                  ...selectedCategories,
                                  category,
                                ]);
                              }
                            }}
                          />
                          <label
                            htmlFor={`form_${category.id}`}
                            style={{ userSelect: 'none' }}
                          >
                            {category.name}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              </Fragment>
            );
          })}
      </ul>
    </View>
  );
}
