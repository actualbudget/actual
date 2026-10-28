import SwiftUI
import WidgetKit

/// A home screen and lock screen shortcut that opens the app straight on the
/// new transaction form. The `actualbudget://` link it opens is registered in
/// App/Info.plist and routed by `routeForAppUrl` in
/// packages/desktop-client/src/components/mobile/deepLinks.ts.
@main
struct AddTransactionWidget: Widget {
    let kind = "org.actualbudget.widgets.add-transaction"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AddTransactionProvider()) { _ in
            AddTransactionWidgetView()
        }
        .configurationDisplayName("Add transaction")
        .description("Opens Actual on a new transaction.")
        .supportedFamilies([.systemSmall, .accessoryCircular])
    }
}

struct AddTransactionEntry: TimelineEntry {
    let date: Date
}

/// The widget shows no data, so its timeline is a single static entry.
struct AddTransactionProvider: TimelineProvider {
    private let entry = AddTransactionEntry(date: Date())

    func placeholder(in context: Context) -> AddTransactionEntry {
        entry
    }

    func getSnapshot(in context: Context, completion: @escaping (AddTransactionEntry) -> Void) {
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AddTransactionEntry>) -> Void) {
        completion(Timeline(entries: [entry], policy: .never))
    }
}

struct AddTransactionWidgetView: View {
    @Environment(\.widgetFamily) private var family

    /// Actual's purple (palette purple500 in the component library).
    private static let accent = Color(red: 0x87 / 255, green: 0x19 / 255, blue: 0xE0 / 255)
    private static let link = URL(string: "actualbudget://transactions/new")!

    var body: some View {
        Group {
            if family == .accessoryCircular {
                ZStack {
                    AccessoryWidgetBackground()
                    Image(systemName: "plus")
                        .font(.title2)
                        .fontWeight(.semibold)
                }
                .containerBackground(for: .widget) { Color.clear }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(Self.accent)
                        Image(systemName: "plus")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                    }
                    .frame(width: 44, height: 44)
                    Text("Add transaction")
                        .font(.headline)
                        .lineLimit(2)
                        .minimumScaleFactor(0.8)
                    Text("Actual")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .containerBackground(for: .widget) { Color(.systemBackground) }
            }
        }
        .widgetURL(Self.link)
    }
}
