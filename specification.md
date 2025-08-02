# Hierarchical Categories Specification

## 1. Feature Overview

This document outlines the implementation of hierarchical subcategories within Actual Budget. The primary goal is to allow users to organize their categories into a nested structure (parent categories with child subcategories) for more granular budgeting and reporting, while maintaining backward compatibility with existing functionalities.

## 2. User Experience (UX)

*   **Creation:** Users should be able to create a new category and assign an existing category as its parent. This could be done via a dropdown picker during category creation/editing.
*   **Viewing:** Categories will be displayed in a tree-like structure in the budget view, with subcategories indented under their parents. Expand/collapse functionality will be available for parent categories.
*   **Budgeting:** Subcategories will *not* have their own independent budget values. Instead, their spending will roll up into their parent category's budget. This means budgeting is done at the parent category level, and subcategories serve as "tags" or "fine filters" for transactions.
*   **Editing/Deletion:**
    *   Editing a category will allow changing its parent.
    *   Deleting a parent category should offer options: either reassign its subcategories to another parent/no parent, or recursively delete the subcategories. The latter is preferred for simplicity and data integrity, similar to how group deletion works.
*   **Reporting:** Future reports (e.g., Sankey diagrams) can leverage the hierarchical structure for enhanced visualization and analysis.

## 3. Data Model

The core principle is to keep the backend data model largely flat, with hierarchy primarily managed in the frontend UI.

*   **`CategoryEntity` (`packages/loot-core/src/types/models/category.ts`):**
    *   A new optional field `parent_id?: string | null;` will be added. This `parent_id` will reference the `id` of another `CategoryEntity`, establishing the parent-child relationship.
    *   `null` or `undefined` `parent_id` indicates a top-level category.

*   **`DbCategory` (`packages/loot-core/src/server/db/types/index.ts`):**
    *   The `parent_id?: string | null;` field will also be added here to reflect the database schema.

*   **AQL Schema (`packages/loot-core/src/server/aql/schema/index.ts`):**
    *   The `categories` schema will include `parent_id: f('id', { ref: 'categories' }),` to make the field queryable and ensure referential integrity within the AQL system.

*   **Database Migration (`packages/loot-core/migrations/TIMESTAMP_add_parentid_subcategory.sql`):**
    *   A new migration will add the `parent_id` column to the `categories` table: `ALTER TABLE categories ADD COLUMN parent_id TEXT DEFAULT null;`.

## 4. Backend Logic (Minimal Impact)

The backend will largely remain unaware of the hierarchical structure, treating categories as a flat list. The `parent_id` will simply be another column to store.

*   **`packages/loot-core/src/server/budget/app.ts`:**
    *   `createCategory`: Will be updated to accept an optional `parent_id` when creating a new category.
    *   `updateCategory`: Will be updated to allow changing a category's `parent_id`.
    *   `deleteCategory`: Will need to handle child categories. The preferred approach is to recursively delete child categories when a parent is deleted, similar to `deleteCategoryGroup`. This ensures data consistency.
    *   `getCategories`: Will continue to return a flat list of `CategoryEntity` objects. The hierarchy building happens exclusively on the frontend.

## 5. Frontend Logic (Primary Focus)

The frontend is responsible for transforming the flat category data into a hierarchical view and managing user interactions with this structure.

*   **`buildCategoryHierarchy` (`packages/desktop-client/src/components/util/BuildCategoryHierarchy.ts`):**
    *   **Input:** A flat array of `CategoryEntity[]`.
    *   **Output:** An array of `HierarchicalCategory[]`, where `HierarchicalCategory` extends `CategoryEntity` and includes a `subcategories?: HierarchicalCategory[]` property.
    *   **Logic:**
        1.  Create a map of all categories by their `id` for efficient lookup.
        2.  Initialize `subcategories` array for each category.
        3.  Iterate through categories: if a category has a `parent_id`, add it to its parent's `subcategories` array. Otherwise, add it to the `rootCategories` array.
        4.  Sort categories and subcategories by `sort_order`.
        5.  Memoize the function for performance.

*   **`useCategories` (`packages/desktop-client/src/hooks/useCategories.ts`):**
    *   This hook will fetch the flat list of categories from the Redux store.
    *   It will then use `buildCategoryHierarchy` to transform this flat list into a hierarchical structure.
    *   It will expose this hierarchical data (e.g., as `hierarchicalCategories`) alongside the existing `list` and `grouped` properties.

*   **`BudgetCategories.jsx` (`packages/desktop-client/src/components/budget/BudgetCategories.jsx`):**
    *   **Note:** This is a JavaScript file (`.jsx`). No TypeScript type annotations or syntax will be introduced in this file, as type upgrades are out of scope for this feature.
    *   **Data Source:** Will consume the `hierarchicalCategories` from `useCategories`.
    *   **Rendering Logic:**
        *   The `items` `useMemo` will be updated to use a recursive helper function (e.g., `expandCategory`) that iterates through the `hierarchicalCategories`.
        *   `expandCategory` will take a `category` and a `depth` parameter.
        *   It will render the current category and then recursively call itself for each `subcategories` item, incrementing the `depth`.
        *   It will handle `collapsedGroupIds` (which will now apply to parent categories) to show/hide subcategories.
        *   It will handle `newCategoryForGroup` (for adding a new category to a group) and `newCategoryForCategory` (for adding a new subcategory to a parent category).
    *   **`onShowNewCategory`:** Will be updated to accept an optional `parentId` (the ID of the parent category).
    *   **`SidebarCategory`, `ExpenseCategory`, `IncomeCategory`:** These components will receive a `depth` prop and use it to apply `paddingLeft` for visual indentation.

*   **`SidebarGroup`, `ExpenseGroup`, `IncomeGroup`:** These components will continue to render category groups. Their internal rendering logic will need to be updated to iterate through the `categories` array (which now contains `HierarchicalCategory` objects) and use the `expandCategory` helper.

## 6. Key Principles

*   **Backward Compatibility:** Existing functionalities that expect a flat list of categories will continue to work without modification, as the hierarchy is built on the frontend.
*   **UI-Driven Hierarchy:** The complex tree structure is a presentation concern, not a core data storage concern.
*   **Modularity:** Keep functions small and focused (e.g., `buildCategoryHierarchy` is separate from rendering components).
*   **Performance:** Use `memoizeOne` and `useMemo` to optimize rendering and data transformation.
*   **User-Centric Design:** Prioritize an intuitive user experience for managing nested categories.
