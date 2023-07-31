import React, { useState } from 'react';

import Eye from '../../icons/v2/Eye';
import EyeSlashed from '../../icons/v2/EyeSlashed';
import {
  type CategoryGroup,
  type CategoryListProps,
} from '../autocomplete/CategorySelect';
import Button from '../common/Button';
import { Checkbox } from '../forms';

type CategorySelectorProps = {
  categoryGroups: Array<CategoryGroup>;
  selectedCategories: CategoryListProps['items'];
  setSelectedCategories: ([]) => null;
};

export default function CategorySelector({
  categoryGroups,
  selectedCategories,
  setSelectedCategories,
}: CategorySelectorProps) {
  const [uncheckedHidden, setUncheckedHidden] = useState(false);
  return (
    <>
      <div>
        <Button
          type="bare"
          style={{ padding: 4 }}
          onClick={e => setUncheckedHidden(!uncheckedHidden)}
        >
          {uncheckedHidden ? (
            <>
              <Eye width={20} height={20} />
              {'Checked'}
            </>
          ) : (
            <>
              <EyeSlashed width={20} height={20} />
              {'All'}
            </>
          )}
        </Button>
      </div>
      <ul
        style={{
          listStyle: 'none',
          marginLeft: 0,
          paddingLeft: 0,
          paddingRight: 10,
        }}
      >
        {categoryGroups &&
          categoryGroups.map(categoryGroup => {
            const allCategoriesInGroupSelected = categoryGroup.categories.every(
              category =>
                selectedCategories.some(
                  selectedCategory => selectedCategory.id === category.id,
                ),
            );
            const noCategorySelected = categoryGroup.categories.every(
              category =>
                !selectedCategories.some(
                  selectedCategory => selectedCategory.id === category.id,
                ),
            );
            return (
              <>
                <li
                  style={{
                    display:
                      noCategorySelected && uncheckedHidden ? 'none' : 'flex',
                    marginBottom: 4,
                    flexDirection: 'row',
                  }}
                  key={categoryGroup.id}
                >
                  <Checkbox
                    id={`form_${categoryGroup.id}`}
                    checked={allCategoriesInGroupSelected}
                    onChange={e => {
                      const selectedCategoriesExcludingGroupCategories =
                        selectedCategories.filter(
                          selectedCategory =>
                            !categoryGroup.categories.some(
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
                            categoryGroup.categories,
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
                    {categoryGroup.categories.map((category, index) => {
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
                            marginBottom: 2,
                          }}
                        >
                          <Checkbox
                            id={`form_${category.id}`}
                            checked={isChecked}
                            onChange={e => {
                              if (isChecked) {
                                setSelectedCategories(
                                  selectedCategories.filter(
                                    selectedCategory =>
                                      selectedCategory.id != category.id,
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
              </>
            );
          })}
      </ul>
    </>
  );
}
