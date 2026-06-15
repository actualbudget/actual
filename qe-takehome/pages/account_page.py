"""Account page — add transactions and mark them cleared."""

from playwright.sync_api import Page


class AccountPage:
    def __init__(self, page: Page) -> None:
        self.page = page
        self.name = page.get_by_test_id("account-name")
        self.balance = page.get_by_test_id("account-balance")
        self.table = page.get_by_test_id("transaction-table")
        self.new_row = page.get_by_test_id("new-transaction")

    def open(self, account_name: str) -> None:
        self.page.get_by_role("link", name=account_name).click()
        self.table.wait_for()

    def add_new(self) -> None:
        self.page.get_by_role("button", name="Add New").click()

    def fill(self, payee: str, debit: str, category: str) -> None:
        row = self.new_row.get_by_test_id("row")

        payee_cell = row.get_by_test_id("payee")
        payee_cell.click()
        payee_cell.get_by_role("textbox").press_sequentially(payee)
        self.page.keyboard.press("Tab")

        debit_cell = row.get_by_test_id("debit")
        debit_cell.click()
        debit_cell.get_by_role("textbox").press_sequentially(debit)
        self.page.keyboard.press("Tab")

        category_cell = row.get_by_test_id("category")
        category_cell.click()
        category_cell.get_by_role("textbox").press_sequentially(category)
        self.page.keyboard.press("Tab")

    def cancel(self) -> None:
        self.page.get_by_role("button", name="Cancel").click()

    def save(self) -> None:
        self.page.get_by_test_id("add-button").click()
        # App keeps an empty new row open until Cancel is clicked
        self.page.get_by_role("button", name="Cancel").click()

    def add(self, payee: str, debit: str, category: str) -> None:
        self.add_new()
        self.fill(payee, debit, category)
        self.save()

    def mark_cleared(self, payee: str) -> None:
        row = self.table.get_by_test_id("row").filter(has_text=payee).first
        row.get_by_test_id("cleared").click()
