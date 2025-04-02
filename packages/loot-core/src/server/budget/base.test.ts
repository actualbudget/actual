// @ts-strict-ignore
import * as monthUtils from '../../shared/months';
import * as db from '../db';
import * as sheet from '../sheet';

import { createAllBudgets } from './base';

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('Base budget', () => {
  it('Recomputes budget cells when account fields change', async () => {
    await sheet.loadSpreadsheet(db);

    await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'income',
      is_income: 1,
    });
    const catId = await db.insertCategory({
      name: 'foo',
      cat_group: 'group1',
    });

    await createAllBudgets();

    // Insert a transaction referencing an account that doesn't exist
    // yet
    await db.insertTransaction({
      date: '2016-12-15',
      amount: -5000,
      account: '29eef937-9933-49ef-80d9-71627074cf31',
      category: catId,
    });

    // Make sure that the spreadsheet finishes processing to make sure
    // the next change doesn't get batched in with it
    await sheet.waitOnSpreadsheet();

    // The category should have nothing spent on it yet
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2016-12'),
        `sum-amount-${catId}`,
      ),
    ).toBe(0);

    // Create the referenced account
    await db.insertAccount({
      id: '29eef937-9933-49ef-80d9-71627074cf31',
      name: 'foo',
    });

    // Make sure the spreadsheet finishes processing
    await sheet.waitOnSpreadsheet();

    // The category should see the transaction
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2016-12'),
        `sum-amount-${catId}`,
      ),
    ).toBe(-5000);
  });

  it('Excludes hidden categories from group totals', async () => {
    await sheet.loadSpreadsheet(db);

    // Create a group with multiple categories
    await db.insertCategoryGroup({ id: 'group1', name: 'Test Group' });
    await db.insertCategoryGroup({
      id: 'group2',
      name: 'Income',
      is_income: 1,
    });
    
    // Create visible category
    const visibleCatId = await db.insertCategory({
      name: 'Visible Category',
      cat_group: 'group1',
    });
    
    // Create hidden category (like "Transfers")
    const hiddenCatId = await db.insertCategory({
      name: 'Hidden Category',
      cat_group: 'group1',
      hidden: 1,
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    // Add transactions to each category
    await db.insertAccount({ id: 'account1', name: 'Account 1' });
    
    // Add transaction to visible category
    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleCatId,
    });
    
    // Add transaction to hidden category
    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify individual category amounts
    expect(
      sheet.getCellValue(sheetName, `sum-amount-${visibleCatId}`),
    ).toBe(-1000);
    
    expect(
      sheet.getCellValue(sheetName, `sum-amount-${hiddenCatId}`),
    ).toBe(-2000);

    // Verify group total only includes visible category
    expect(
      sheet.getCellValue(sheetName, `group-sum-amount-group1`),
    ).toBe(-1000);

    // Now toggle hidden status of the hidden category to make it visible
    await db.updateCategory({ 
      id: hiddenCatId, 
      name: 'Hidden Category', 
      cat_group: 'group1',
      is_income: 0,
      hidden: 0 
    });
    
    await sheet.waitOnSpreadsheet();

    // After making hidden category visible, group total should include both
    expect(
      sheet.getCellValue(sheetName, `group-sum-amount-group1`),
    ).toBe(-3000);
  });

  it('Excludes hidden category groups from budget totals', async () => {
    await sheet.loadSpreadsheet(db);

    // Create two expense groups - one visible, one hidden
    await db.insertCategoryGroup({ id: 'visible-group', name: 'Visible Group' });
    await db.insertCategoryGroup({ 
      id: 'hidden-group', 
      name: 'Hidden Group',
      hidden: 1 
    });
    
    // Create income group (needed for budget setup)
    await db.insertCategoryGroup({
      id: 'income-group',
      name: 'Income',
      is_income: 1,
    });
    
    // Create categories in each group
    const visibleGroupCatId = await db.insertCategory({
      name: 'Visible Group Category',
      cat_group: 'visible-group',
    });
    
    const hiddenGroupCatId = await db.insertCategory({
      name: 'Hidden Group Category',
      cat_group: 'hidden-group',
    });

    await createAllBudgets();
    const month = '2017-01';
    const sheetName = monthUtils.sheetForMonth(month);

    // Add transactions
    await db.insertAccount({ id: 'account1', name: 'Account 1' });
    
    // Add transaction to visible group category
    await db.insertTransaction({
      date: '2017-01-15',
      amount: -1000,
      account: 'account1',
      category: visibleGroupCatId,
    });
    
    // Add transaction to hidden group category
    await db.insertTransaction({
      date: '2017-01-15',
      amount: -2000,
      account: 'account1',
      category: hiddenGroupCatId,
    });

    await sheet.waitOnSpreadsheet();

    // Verify individual amounts
    expect(
      sheet.getCellValue(sheetName, `sum-amount-${visibleGroupCatId}`),
    ).toBe(-1000);
    
    expect(
      sheet.getCellValue(sheetName, `sum-amount-${hiddenGroupCatId}`),
    ).toBe(-2000);
    
    expect(
      sheet.getCellValue(sheetName, `group-sum-amount-visible-group`),
    ).toBe(-1000);
    
    expect(
      sheet.getCellValue(sheetName, `group-sum-amount-hidden-group`),
    ).toBe(-2000);

    // Verify total spent only includes visible group
    expect(
      sheet.getCellValue(sheetName, 'total-spent'),
    ).toBe(-1000);

    // Now toggle hidden status of the hidden group to make it visible
    await db.updateCategoryGroup({ 
      id: 'hidden-group', 
      name: 'Hidden Group',
      is_income: 0,
      hidden: 0 
    });
    
    await sheet.waitOnSpreadsheet();

    // After making hidden group visible, total should include both
    expect(
      sheet.getCellValue(sheetName, 'total-spent'),
    ).toBe(-3000);
  });
});
