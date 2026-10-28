import SwiftUI
import WidgetKit

/// A shortcut that opens the app straight on the new transaction form.
struct AddTransactionWidget: Widget {
    let kind = "org.actualbudget.widgets.add-transaction"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SnapshotProvider()) { entry in
            AddTransactionWidgetView(entry: entry)
        }
        .configurationDisplayName("Add transaction")
        .description("Opens Actual on a new transaction.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}

struct AddTransactionWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SnapshotEntry

    /// Works before the app has written a snapshot too, since it only needs
    /// the deep link.
    private var label: String {
        entry.snapshot?.labels.addTransaction ?? "Add transaction"
    }

    var body: some View {
        if family == .accessoryCircular {
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "plus")
                    .font(.title2)
                    .fontWeight(.semibold)
            }
            .widgetURL(WidgetLink.addTransaction)
            .widgetBackground(.clear)
        } else {
            VStack(alignment: .leading, spacing: 8) {
                ZStack {
                    Circle()
                        .fill(WidgetTheme.accent)
                    Image(systemName: "plus")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                }
                .frame(width: 44, height: 44)
                Spacer(minLength: 0)
                Text(label)
                    .font(.headline)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Text("Actual")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(WidgetLink.addTransaction)
            .widgetBackground()
        }
    }
}
