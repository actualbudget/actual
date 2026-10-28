import Foundation
import WidgetKit

/// The data the app writes for the widgets, stored as JSON in the shared app
/// group. Keep in sync with `WidgetSnapshot` in
/// packages/desktop-client/src/components/mobile/widgets/homeScreenWidgetsPlugin.ts.
struct WidgetSnapshot: Decodable {
    struct Amount: Decodable {
        /// Integer amount in the budget's minor currency unit, only used to
        /// pick a colour. The text shown is `formatted`, which the app has
        /// already formatted with the user's number format and currency, and
        /// masked when privacy mode is on.
        let amount: Int
        let formatted: String
    }

    struct Account: Decodable, Identifiable {
        let id: String
        let name: String
        let balance: Amount
    }

    struct Category: Decodable, Identifiable {
        let id: String
        let name: String
        let balance: Amount
        let budgeted: Int
        /// Activity this month, negative for spending.
        let spent: Int

        /// Share of the budgeted amount spent so far, from 0 to 1.
        var progress: Double {
            let spentAmount = max(0, -spent)
            if budgeted <= 0 {
                return spentAmount > 0 ? 1 : 0
            }
            return min(1, Double(spentAmount) / Double(budgeted))
        }

        var isOverspent: Bool {
            balance.amount < 0
        }
    }

    /// Labels translated by the app, so the widgets follow its language.
    struct Labels: Decodable {
        let budget: String
        let accounts: String
        /// "To budget" for envelope budgets, "Saved" for tracking budgets.
        let summary: String
        let addTransaction: String
    }

    let version: Int
    let budgetName: String
    let monthName: String
    let isPrivacyEnabled: Bool
    let labels: Labels
    let summary: Amount
    let accountsTotal: Amount
    let accounts: [Account]
    let categories: [Category]
}

extension WidgetSnapshot {
    /// Shown in the widget gallery and as the redacted placeholder.
    static let sample = WidgetSnapshot(
        version: 1,
        budgetName: "My budget",
        monthName: "October 2026",
        isPrivacyEnabled: false,
        labels: Labels(
            budget: "Budget",
            accounts: "Accounts",
            summary: "To budget",
            addTransaction: "Add transaction"
        ),
        summary: Amount(amount: 24_050, formatted: "240.50"),
        accountsTotal: Amount(amount: 532_420, formatted: "5,324.20"),
        accounts: [
            Account(id: "checking", name: "Checking", balance: Amount(amount: 182_420, formatted: "1,824.20")),
            Account(id: "savings", name: "Savings", balance: Amount(amount: 400_000, formatted: "4,000.00")),
            Account(id: "credit", name: "Credit card", balance: Amount(amount: -50_000, formatted: "-500.00")),
        ],
        categories: [
            Category(id: "groceries", name: "Groceries", balance: Amount(amount: 12_500, formatted: "125.00"), budgeted: 40_000, spent: -27_500),
            Category(id: "dining", name: "Dining out", balance: Amount(amount: -1_200, formatted: "-12.00"), budgeted: 10_000, spent: -11_200),
            Category(id: "transport", name: "Transport", balance: Amount(amount: 6_000, formatted: "60.00"), budgeted: 8_000, spent: -2_000),
            Category(id: "fun", name: "Fun money", balance: Amount(amount: 5_000, formatted: "50.00"), budgeted: 5_000, spent: 0),
        ]
    )
}

enum WidgetStore {
    /// Shared with the app target; see App/App.entitlements and
    /// ActualWidgets.entitlements.
    static let appGroup = "group.com.actualbudget.actual"
    static let snapshotKey = "widgetSnapshot"

    static func load() -> WidgetSnapshot? {
        guard let data = UserDefaults(suiteName: appGroup)?.data(forKey: snapshotKey) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }
}

struct SnapshotEntry: TimelineEntry {
    let date: Date
    /// Nil until the app has written a snapshot (or after it cleared it).
    let snapshot: WidgetSnapshot?
}

struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        // The widget gallery shows sample data until the app has written a
        // snapshot, so the widget does not look broken before first use.
        let snapshot = WidgetStore.load() ?? (context.isPreview ? WidgetSnapshot.sample : nil)
        completion(SnapshotEntry(date: Date(), snapshot: snapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        // The app reloads the timelines whenever it writes a new snapshot, so
        // there is nothing to schedule here.
        let entry = SnapshotEntry(date: Date(), snapshot: WidgetStore.load())
        completion(Timeline(entries: [entry], policy: .never))
    }
}
