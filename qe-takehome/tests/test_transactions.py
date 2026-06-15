from playwright.sync_api import Page, expect

from data.constants import ALLY_SAVINGS, FOOD, PAYEE_KROGER, TXN_AMOUNT
from flows.app_flows import open_test_budget
from pages.account_page import AccountPage


def test_account_page_loads(page: Page):
    # TXN-01: open an account from the sidebar
    open_test_budget(page)

    account_page = AccountPage(page)
    account_page.open(ALLY_SAVINGS)

    expect(account_page.name).to_have_text(ALLY_SAVINGS)
    expect(account_page.table).to_be_visible()


def test_cancel_new_transaction(page: Page):
    # TXN-03: cancel removes the draft row without saving
    open_test_budget(page)

    account_page = AccountPage(page)
    account_page.open(ALLY_SAVINGS)

    account_page.add_new()
    expect(account_page.new_row).to_be_visible()

    account_page.cancel()
    expect(account_page.new_row).not_to_be_visible()


def test_add_food_transaction(page: Page):
    # TXN-02: add a transaction and confirm payee appears in the table
    open_test_budget(page)

    account_page = AccountPage(page)
    account_page.open(ALLY_SAVINGS)

    account_page.add_new()
    account_page.fill(PAYEE_KROGER, TXN_AMOUNT, FOOD)
    account_page.save()

    expect(account_page.new_row).not_to_be_visible()
    expect(
        account_page.table.get_by_test_id("row").first.get_by_test_id("payee")
    ).to_have_text(PAYEE_KROGER)


def test_mark_transaction_cleared(page: Page):
    # TXN-04: cleared tick changes from hollow to filled
    open_test_budget(page)

    account_page = AccountPage(page)
    account_page.open(ALLY_SAVINGS)

    account_page.add_new()
    account_page.fill(PAYEE_KROGER, TXN_AMOUNT, FOOD)
    account_page.save()

    row = account_page.table.get_by_test_id("row").filter(has_text=PAYEE_KROGER).first
    cleared_icon = row.get_by_test_id("cleared").locator("path")
    icon_shape_before = cleared_icon.get_attribute("d")

    account_page.mark_cleared(PAYEE_KROGER)

    expect(cleared_icon).not_to_have_attribute("d", icon_shape_before or "")
