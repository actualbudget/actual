"""Budget page — assign amounts, read balances, transfer between categories."""

import re
import time

from playwright.sync_api import Locator, Page, expect


def parse_money(text: str) -> float:
    """Turn displayed money text (e.g. '1,234.56') into a float."""
    text = text.replace("\u2212", "-").strip()
    amounts = re.findall(r"-?\d[\d,]*\.\d{2}", text)
    if amounts:
        return float(amounts[-1].replace(",", ""))
    fallback = re.search(r"-?[\d,.]+", text)
    if not fallback:
        return 0.0
    return float(fallback.group().replace(",", ""))


def to_cents(amount: float) -> int:
    """Compare money as integer cents — avoids float rounding bugs."""
    return round(amount * 100)


class BudgetPage:
    def __init__(self, page: Page) -> None:
        self.page = page
        self.summary = page.get_by_test_id("budget-summary")
        self.table = page.get_by_test_id("budget-table")

    def wait_for(self, timeout: int = 10_000) -> None:
        self.table.wait_for(timeout=timeout)

    def category_row(self, category_name: str) -> Locator:
        return self.table.get_by_test_id("row").filter(
            has=self.page.get_by_text(category_name, exact=True)
        ).first

    def balance_cell(self, category_name: str) -> Locator:
        return self.category_row(category_name).get_by_test_id("balance").get_by_test_id(
            re.compile(r"^budget")
        )

    def set_budget(self, category_name: str, amount: str) -> None:
        budget_cell = self.category_row(category_name).get_by_test_id("budget").first
        budget_cell.click()
        input_field = budget_cell.locator("input")
        input_field.wait_for(state="visible")
        input_field.fill(amount)
        input_field.press("Enter")
        expect(input_field).not_to_be_visible()

    def balance(self, category_name: str) -> float:
        return parse_money(self.balance_cell(category_name).inner_text())

    def balance_cents(self, category_name: str) -> int:
        return to_cents(self.balance(category_name))

    def spent(self, category_name: str) -> float:
        spent_text = self.category_row(category_name).get_by_test_id(
            "category-month-spent"
        ).inner_text()
        return parse_money(spent_text)

    def transfer_balance(self, from_category: str, to_category: str) -> float:
        """Move all balance from one category to another. Returns amount moved."""
        amount_moved = self.balance(from_category)

        self.balance_cell(from_category).click()
        self.page.get_by_role("button", name="Transfer to another category").click()

        category_picker = self.page.get_by_placeholder("(none)")
        category_picker.click()
        category_picker.press_sequentially(to_category)
        self.page.keyboard.press("Enter")

        transfer_button = self.page.get_by_role("button", name="Transfer")
        expect(transfer_button).to_be_enabled(timeout=5_000)
        transfer_button.click()

        # Wait for source to empty, then give the UI time to update the target row
        expect(self.balance_cell(from_category)).to_have_text("0.00", timeout=10_000)
        self.page.wait_for_timeout(1_000)

        return amount_moved

    def wait_for_balance_cents(
        self, category_name: str, expected_cents: int, timeout: int = 10_000
    ) -> None:
        """Poll until a category balance matches the expected cents value."""
        deadline = time.time() + timeout / 1000
        while time.time() < deadline:
            if self.balance_cents(category_name) == expected_cents:
                return
            self.page.wait_for_timeout(100)
        assert self.balance_cents(category_name) == expected_cents
