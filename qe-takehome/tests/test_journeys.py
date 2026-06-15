from playwright.sync_api import Page, expect

from data.constants import (
    ALLY_SAVINGS,
    FOOD,
    FOOD_BUDGET_DISPLAY,
    FOOD_BUDGET_INPUT,
    PAYEE_KROGER,
    SAVINGS,
    SAVINGS_BUDGET_DISPLAY,
    SAVINGS_BUDGET_INPUT,
    TXN_AMOUNT,
    TXN_AMOUNT_VALUE,
)
from flows.app_flows import clear_sidebar_hover, open_test_budget
from pages.account_page import AccountPage
from pages.budget_page import BudgetPage


def test_setup_and_budget(page: Page):
    # J-01: budget two categories in one session
    budget_page = open_test_budget(page)
    clear_sidebar_hover(page)

    budget_page.set_budget(FOOD, FOOD_BUDGET_INPUT)
    budget_page.set_budget(SAVINGS, SAVINGS_BUDGET_INPUT)

    expect(budget_page.category_row(FOOD).get_by_test_id("budget")).to_have_text(
        FOOD_BUDGET_DISPLAY
    )
    expect(budget_page.category_row(SAVINGS).get_by_test_id("budget")).to_have_text(
        SAVINGS_BUDGET_DISPLAY
    )


def test_transaction_updates_food_spent(page: Page):
    # J-02: a food transaction on an account updates food spent on the budget page
    budget_page = open_test_budget(page)
    clear_sidebar_hover(page)

    food_spent_before = budget_page.spent(FOOD)

    page.get_by_role("link", name=ALLY_SAVINGS).click()
    account_page = AccountPage(page)
    account_page.add(PAYEE_KROGER, TXN_AMOUNT, FOOD)

    page.goto("/budget")
    budget_page = BudgetPage(page)
    budget_page.wait_for()

    food_spent_after = budget_page.spent(FOOD)
    assert food_spent_after == food_spent_before - TXN_AMOUNT_VALUE
