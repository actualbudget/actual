import SwiftUI
import WidgetKit

/// A shortcut that opens the app straight on the new transaction form.
struct AddTransactionWidget: Widget {
    let kind = "org.actualbudget.widgets.add-transaction"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AddTransactionProvider()) { entry in
            AddTransactionWidgetView(entry: entry)
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
    func placeholder(in context: Context) -> AddTransactionEntry {
        AddTransactionEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (AddTransactionEntry) -> Void) {
        completion(AddTransactionEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AddTransactionEntry>) -> Void) {
        completion(Timeline(entries: [AddTransactionEntry(date: Date())], policy: .never))
    }
}

struct AddTransactionWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: AddTransactionEntry

    /// Actual's purple (palette purple500 in the component library).
    private static let accent = Color(red: 0x87 / 255, green: 0x19 / 255, blue: 0xE0 / 255)

    /// Handled by `routeForWidgetUrl` in
    /// packages/desktop-client/src/components/mobile/widgets/homeScreenWidgetsPlugin.ts.
    /// The `actualbudget` scheme is registered in App/Info.plist.
    private static let link = URL(string: "actualbudget://transactions/new")!

    var body: some View {
        if family == .accessoryCircular {
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "plus")
                    .font(.title2)
                    .fontWeight(.semibold)
            }
            .widgetURL(Self.link)
            .widgetBackground(.clear)
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
                Spacer(minLength: 0)
                Text("Add transaction")
                    .font(.headline)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Text("Actual")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(Self.link)
            .widgetBackground(Color(.systemBackground))
        }
    }
}

private extension View {
    /// Widget background that works on iOS 16 and the iOS 17 container API.
    /// Pass `.clear` for lock screen (accessory) families.
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { color }
        } else {
            padding()
                .background(color)
        }
    }
}
