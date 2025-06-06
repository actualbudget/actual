import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { CategorySelector } from './CategorySelector';
import '@testing-library/jest-dom';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function makeCategory(
  id: string,
  name: string,
  hidden = false,
): CategoryEntity {
  return { id, name, hidden } as CategoryEntity;
}

function makeCategoryGroup(
  id: string,
  name: string,
  categories: CategoryEntity[],
): CategoryGroupEntity {
  return { id, name, categories } as CategoryGroupEntity;
}

describe('CategorySelector', () => {
  const cat1 = makeCategory('cat1', 'Category 1');
  const cat2 = makeCategory('cat2', 'Category 2');
  const cat3 = makeCategory('cat3', 'Category 3', true);
  const group1 = makeCategoryGroup('group1', 'Group 1', [cat1, cat2, cat3]);
  const cat4 = makeCategory('cat4', 'Category 4');
  const group2 = makeCategoryGroup('group2', 'Group 2', [cat4]);
  const categoryGroups = [group1, group2];

  function setup(selected: CategoryEntity[] = []) {
    const setSelectedCategories = vi.fn();
    render(
      <CategorySelector
        categoryGroups={categoryGroups}
        selectedCategories={selected}
        setSelectedCategories={setSelectedCategories}
        showHiddenCategories={true}
      />,
    );
    return { setSelectedCategories };
  }

  it('renders category group and category checkboxes', () => {
    setup();
    expect(screen.getByLabelText('Group 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Category 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Category 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Category 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Group 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Category 4')).toBeInTheDocument();
  });

  it('calls setSelectedCategories when a category is selected', async () => {
    const { setSelectedCategories } = setup();
    const cat1Checkbox = screen.getByLabelText('Category 1');
    await userEvent.click(cat1Checkbox);
    expect(setSelectedCategories).toHaveBeenCalled();
  });

  it('calls setSelectedCategories when a group is selected', async () => {
    const { setSelectedCategories } = setup();
    const group1Checkbox = screen.getByLabelText('Group 1');
    await userEvent.click(group1Checkbox);
    expect(setSelectedCategories).toHaveBeenCalled();
  });

  it('selects all categories when Select All is clicked', async () => {
    const { setSelectedCategories } = setup();
    const selectAllButton = screen.getByRole('button', { name: 'Select All' });
    await userEvent.click(selectAllButton);
    expect(setSelectedCategories).toHaveBeenCalledWith([
      cat1,
      cat2,
      cat3,
      cat4,
    ]);
  });

  it('unselects all categories when Unselect All is clicked', async () => {
    const { setSelectedCategories } = setup([cat1, cat2, cat3, cat4]);
    const unselectAllButton = screen.getByRole('button', {
      name: 'Unselect All',
    });
    await userEvent.click(unselectAllButton);
    expect(setSelectedCategories).toHaveBeenCalledWith([]);
  });
});
