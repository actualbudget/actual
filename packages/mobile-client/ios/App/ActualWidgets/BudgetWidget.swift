import SwiftUI
import WidgetKit

/// "To budget" (or "Saved" for tracking budgets) for the current month, plus
/// the categories at the top of the budget on the larger sizes.
struct BudgetWidget: Widget {
    let kind = "org.actualbudget.widgets.budget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            BudgetWidgetView(entry: entry)
        }
        .configurationDisplayName("Budget")
        .description("How much is left to budget this month, and the categories at the top of your budget.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryInline,
            .accessoryCircular,
            .accessoryRectangular,
        ])
    }
}

struct BudgetWidgetView: View {
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
                BudgetSmallView(snapshot: snapshot)
            case .systemMedium:
                BudgetMediumView(snapshot: snapshot)
            default:
                BudgetLargeView(snapshot: snapshot)
            }
        } else {
            EmptyStateView(title: "Budget")
        }
    }

    @ViewBuilder
    private var accessory: some View {
        if let snapshot = entry.snapshot {
            switch family {
            case .accessoryInline:
                Text(verbatim: "\(snapshot.labels.summary): \(snapshot.summary.formatted)")
                    .privacySensitive()
                    .widgetURL(WidgetLink.budget)
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 1) {
                        Image(systemName: "chart.pie.fill")
                            .font(.caption2)
                        Text(snapshot.summary.formatted)
                            .font(.caption2.monospacedDigit())
                            .fontWeight(.semibold)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                            .privacySensitive()
                    }
                    .padding(.horizontal, 4)
                }
                .widgetURL(WidgetLink.budget)
            default:
                VStack(alignment: .leading, spacing: 2) {
                    Text(snapshot.labels.summary)
                        .font(.caption2)
                        .textCase(.uppercase)
                    Text(snapshot.summary.formatted)
                        .font(.headline.monospacedDigit())
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        .privacySensitive()
                    Text(snapshot.monthName)
                        .font(.caption2)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .widgetURL(WidgetLink.budget)
            }
        } else {
            AccessoryEmptyStateView()
        }
    }
}

private struct SummaryBlock: View {
    let snapshot: WidgetSnapshot
    var amountFont: Font = .title2

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(snapshot.labels.summary)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            AmountText(amount: snapshot.summary, font: amountFont, tint: .signed)
            Text(snapshot.monthName)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
    }
}

private struct CategoryRow: View {
    let category: WidgetSnapshot.Category
    var showsProgress = false

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline) {
                Text(category.name)
                    .font(.caption)
                    .lineLimit(1)
                Spacer(minLength: 8)
                AmountText(amount: category.balance, font: .caption)
            }
            if showsProgress {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.secondary.opacity(0.2))
                        Capsule()
                            .fill(category.isOverspent ? WidgetTheme.negative : WidgetTheme.accent)
                            .frame(width: geometry.size.width * CGFloat(category.progress))
                    }
                }
                .frame(height: 4)
                .privacySensitive()
            }
        }
    }
}

private struct BudgetSmallView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeader(title: snapshot.labels.budget)
            Spacer(minLength: 0)
            SummaryBlock(snapshot: snapshot)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(WidgetLink.budget)
    }
}

private struct BudgetMediumView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(title: snapshot.labels.budget, subtitle: snapshot.budgetName)
            HStack(alignment: .top, spacing: 12) {
                SummaryBlock(snapshot: snapshot)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                if !snapshot.categories.isEmpty {
                    Divider()
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(snapshot.categories.prefix(3)) { category in
                            CategoryRow(category: category)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(WidgetLink.budget)
    }
}

private struct BudgetLargeView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(title: snapshot.labels.budget, subtitle: snapshot.budgetName)
            SummaryBlock(snapshot: snapshot, amountFont: .title)
            if !snapshot.categories.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(snapshot.categories.prefix(8)) { category in
                        CategoryRow(category: category, showsProgress: true)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(WidgetLink.budget)
    }
}
