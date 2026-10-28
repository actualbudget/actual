import SwiftUI
import WidgetKit

/// The total of the on-budget accounts, with the accounts themselves on the
/// larger sizes. Tapping an account opens it in the app.
struct AccountsWidget: Widget {
    let kind = "org.actualbudget.widgets.accounts"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            AccountsWidgetView(entry: entry)
        }
        .configurationDisplayName("Account balances")
        .description("The balances of your on-budget accounts.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
    }
}

struct AccountsWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    var body: some View {
        if family.isAccessory {
            accessory
                .widgetBackground(.clear)
        } else {
            home
                .widgetBackground()
        }
    }

    @ViewBuilder
    private var home: some View {
        if let snapshot = entry.snapshot {
            switch family {
            case .systemSmall:
                AccountsListView(snapshot: snapshot, maxRows: 0)
            case .systemMedium:
                AccountsListView(snapshot: snapshot, maxRows: 3)
            default:
                AccountsListView(snapshot: snapshot, maxRows: 10)
            }
        } else {
            EmptyStateView(title: "Accounts")
        }
    }

    @ViewBuilder
    private var accessory: some View {
        if let snapshot = entry.snapshot {
            VStack(alignment: .leading, spacing: 2) {
                Text(snapshot.labels.accounts)
                    .font(.caption2)
                    .textCase(.uppercase)
                Text(snapshot.accountsTotal.formatted)
                    .font(.headline.monospacedDigit())
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .privacySensitive()
                if let first = snapshot.accounts.first {
                    Text(verbatim: "\(first.name) \(first.balance.formatted)")
                        .font(.caption2)
                        .lineLimit(1)
                        .privacySensitive()
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetURL(WidgetLink.accounts)
        } else {
            AccessoryEmptyStateView()
        }
    }
}

private struct AccountRow: View {
    let account: WidgetSnapshot.Account

    var body: some View {
        Link(destination: WidgetLink.account(account.id)) {
            HStack(alignment: .firstTextBaseline) {
                Text(account.name)
                    .font(.caption)
                    .lineLimit(1)
                Spacer(minLength: 8)
                AmountText(amount: account.balance, font: .caption)
            }
        }
    }
}

private struct AccountsListView: View {
    let snapshot: WidgetSnapshot
    /// Number of account rows to show under the total; 0 for the small size.
    let maxRows: Int

    private var hiddenCount: Int {
        max(0, snapshot.accounts.count - maxRows)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(title: snapshot.labels.accounts, subtitle: maxRows > 0 ? snapshot.budgetName : nil)
            if maxRows == 0 {
                Spacer(minLength: 0)
            }
            AmountText(amount: snapshot.accountsTotal, font: maxRows > 0 ? .title2 : .title)
            if maxRows > 0 && !snapshot.accounts.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(snapshot.accounts.prefix(maxRows)) { account in
                        AccountRow(account: account)
                    }
                    if hiddenCount > 0 {
                        Text(verbatim: "+\(hiddenCount)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(WidgetLink.accounts)
    }
}
