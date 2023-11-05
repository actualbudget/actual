import React, { Fragment, useRef, useState, type ReactNode } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/src/types/models';

import Eye from '../../icons/v2/Eye';
import EyeSlashed from '../../icons/v2/EyeSlashed';
import { type CSSProperties } from '../../style';
import {
  type Category,
  type CategoryGroup,
  type CategoryListProps,
} from '../autocomplete/CategoryAutocomplete';
import Button from '../common/Button';
import View from '../common/View';
import { Checkbox } from '../forms';

type ContainerProps = {
  style?: CSSProperties;
  children: (width: number, height: number, host: HTMLDivElement) => ReactNode;
};
export function Container({ style, children }: ContainerProps) {
  const portalHost = useRef<HTMLDivElement>(null);

  return (
    <View
      style={{ height: 300, position: 'relative', flexShrink: 0, ...style }}
    >
      <div ref={portalHost} />
      <AutoSizer>
        {({ width, height }) => (
          <div style={{ width, height }}>
            {children(width, height, portalHost.current)}
          </div>
        )}
      </AutoSizer>
    </View>
  );
}

type CategorySelectorProps = {
  categoryGroups: Array<CategoryGroupEntity>;
  selectedCategories: CategoryListProps['items'];
  setSelectedCategories: (selectedCategories: CategoryEntity[]) => null;
};

export function CategorySelector({
  categoryGroups,
  selectedCategories,
  setSelectedCategories,
}: CategorySelectorProps) {
  const [uncheckedHidden, setUncheckedHidden] = useState(false);

  return (
    <>
      <div>
        <Button onClick={() => setUncheckedHidden(state => !state)}>
          {uncheckedHidden ? (
            <>
              <Eye width={20} height={20} />
              Show unchecked
            </>
          ) : (
            <>
              <EyeSlashed width={20} height={20} />
              Hide unchecked
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
          height: 320,
          flexGrow: 1,
          overflowY: 'scroll',
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
                            marginBottom: 4,
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
    </>
  );
}
