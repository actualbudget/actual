import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { CategorySelector } from './CategorySelector';

function makeCategory({
  id,
  name,
  hidden = false,
  group = '',
}: {
  id: string;
  name: string;
  hidden?: boolean;
  group?: string;
}): CategoryEntity {
  return { id, name, hidden, group } satisfies CategoryEntity;
}

function makeCategoryGroup({
  id,
  name,
  categories,
}: {
  id: string;
  name: string;
  categories: CategoryEntity[];
}): CategoryGroupEntity {
  return { id, name, categories } satisfies CategoryGroupEntity;
}

const cat1 = makeCategory({ id: 'cat1', name: 'Category 1' });
const cat2 = makeCategory({ id: 'cat2', name: 'Category 2' });
const cat3 = makeCategory({ id: 'cat3', name: 'Category 3', hidden: true });
const group1 = makeCategoryGroup({
  id: 'group1',
  name: 'Group 1',
  categories: [cat1, cat2, cat3],
});
const cat4 = makeCategory({ id: 'cat4', name: 'Category 4' });
const group2 = makeCategoryGroup({
  id: 'group2',
  name: 'Group 2',
  categories: [cat4],
});
const categoryGroups = [group1, group2];

const defaultProps = {
  categoryGroups,
  selectedCategories: [],
  setSelectedCategories: vi.fn(),
  showHiddenCategories: true,
};

describe('CategorySelector', () => {
  it('renders category group and category checkboxes', () => {
    render(<CategorySelector {...defaultProps} />);
    expect(screen.getByLabelText('Group 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Category 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Category 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Category 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Group 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Category 4')).toBeInTheDocument();
  });

  it('calls setSelectedCategories when a category is selected', async () => {
    const setSelectedCategories = vi.fn();
    render(
      <CategorySelector
        {...defaultProps}
        setSelectedCategories={setSelectedCategories}
      />,
    );
    await userEvent.click(screen.getByLabelText('Category 1'));
    expect(setSelectedCategories).toHaveBeenCalled();
  });

  it('calls setSelectedCategories when a group is selected', async () => {
    const setSelectedCategories = vi.fn();
    render(
      <CategorySelector
        {...defaultProps}
        setSelectedCategories={setSelectedCategories}
      />,
    );
    await userEvent.click(screen.getByLabelText('Group 1'));
    expect(setSelectedCategories).toHaveBeenCalled();
  });

  it('selects all categories when Select All is clicked', async () => {
    const setSelectedCategories = vi.fn();
    render(
      <CategorySelector
        {...defaultProps}
        setSelectedCategories={setSelectedCategories}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Select All' }));
    expect(setSelectedCategories).toHaveBeenCalledWith([
      cat1,
      cat2,
      cat3,
      cat4,
    ]);
  });

  it('unselects all categories when Unselect All is clicked', async () => {
    const setSelectedCategories = vi.fn();
    render(
      <CategorySelector
        {...defaultProps}
        selectedCategories={[cat1, cat2, cat3, cat4]}
        setSelectedCategories={setSelectedCategories}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Unselect All' }));
    expect(setSelectedCategories).toHaveBeenCalledWith([]);
  });
});
