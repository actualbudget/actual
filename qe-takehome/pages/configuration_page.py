"""First-run setup — server choice and creating a budget file."""

from playwright.sync_api import Page

from pages.budget_page import BudgetPage


class ConfigurationPage:
    def __init__(self, page: Page) -> None:
        self.page = page
        self.heading = page.get_by_role("heading")

    def click_no_server(self) -> None:
        self.page.get_by_role("button", name="Don't use a server").click()

    def create_demo_file(self) -> BudgetPage:
        """View demo — sample budget via the welcome screen."""
        self.page.get_by_role("button", name="View demo").click()
        budget_page = BudgetPage(self.page)
        budget_page.wait_for()
        return budget_page

    def create_test_file(self) -> BudgetPage:
        """Create test file — sample budget in one click (used by most tests)."""
        self.page.get_by_role("button", name="Create test file").click()
        budget_page = BudgetPage(self.page)
        budget_page.wait_for()
        return budget_page
