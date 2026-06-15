from playwright.sync_api import Page, expect

from data.constants import (
    FOOD,
    FOOD_BUDGET_DISPLAY,
    FOOD_BUDGET_INPUT,
    OVERBUDGET_AMOUNT,
    SAVINGS,
    SAVINGS_TRANSFER_BUDGET,
)
from flows.app_flows import clear_sidebar_hover, open_test_budget
from pages.budget_page import to_cents
from pages.configuration_page import ConfigurationPage


def test_budget_loads_with_demo_data(page: Page):
    # BUD-01: welcome flow loads demo budget with sample data
    page.goto("/")
    setup_page = ConfigurationPage(page)

    expect(setup_page.heading).to_have_text("Where's the server?")
    setup_page.click_no_server()
    expect(page.get_by_text("Let's get started!")).to_be_visible()

    budget_page = setup_page.create_demo_file()
    expect(budget_page.table).to_be_visible(timeout=30_000)
    expect(budget_page.summary.get_by_text("Available funds").first).to_be_visible()


def test_assign_budget_to_food(page: Page):
    # BUD-02: type a budget amount and confirm it saves
    budget_page = open_test_budget(page)
    clear_sidebar_hover(page)

    budget_page.set_budget(FOOD, FOOD_BUDGET_INPUT)
    expect(budget_page.category_row(FOOD).get_by_test_id("budget")).to_have_text(
        FOOD_BUDGET_DISPLAY
    )


def test_overbudget_warning(page: Page):
    # BUD-03: budgeting too much shows an overbudget warning
    budget_page = open_test_budget(page)
    clear_sidebar_hover(page)

    budget_page.set_budget(FOOD, OVERBUDGET_AMOUNT)
    expect(budget_page.summary.get_by_text("Overbudgeted").first).to_be_visible()


def test_transfer_between_categories(page: Page):
    # BUD-04: move savings balance into food
    budget_page = open_test_budget(page)
    clear_sidebar_hover(page)

    food_balance_before_cents = budget_page.balance_cents(FOOD)
    budget_page.set_budget(SAVINGS, SAVINGS_TRANSFER_BUDGET)
    expect(budget_page.balance_cell(SAVINGS)).not_to_have_text("0.00")

    amount_moved = budget_page.transfer_balance(SAVINGS, FOOD)
    expected_food_cents = food_balance_before_cents + to_cents(amount_moved)
    budget_page.wait_for_balance_cents(FOOD, expected_food_cents)

    assert budget_page.balance_cents(SAVINGS) == 0
    assert budget_page.balance_cents(FOOD) == expected_food_cents
