"""Shared steps used at the start of many tests."""

from playwright.sync_api import Page

from data.constants import BASE_URL
from pages.budget_page import BudgetPage
from pages.configuration_page import ConfigurationPage


def clear_sidebar_hover(page: Page) -> None:
    """Move mouse to corner so sidebar tooltips do not block clicks."""
    page.mouse.move(0, 0)


def open_test_budget(page: Page) -> BudgetPage:
    """Go to app and open a fresh test budget with sample data."""
    page.goto(BASE_URL)
    setup_page = ConfigurationPage(page)
    return setup_page.create_test_file()
