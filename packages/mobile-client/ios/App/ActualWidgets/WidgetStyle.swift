import SwiftUI
import WidgetKit

enum WidgetTheme {
    /// Actual's purple (palette purple500 in the component library).
    static let accent = Color(red: 0x87 / 255, green: 0x19 / 255, blue: 0xE0 / 255)
    static let positive = Color(red: 0x1C / 255, green: 0x8C / 255, blue: 0x5E / 255)
    static let negative = Color(red: 0xC9 / 255, green: 0x2A / 255, blue: 0x2A / 255)
}

/// Deep links handled by `routeForWidgetUrl` in
/// packages/desktop-client/src/components/mobile/widgets/homeScreenWidgetsPlugin.ts.
/// The `actualbudget` scheme is registered in App/Info.plist.
enum WidgetLink {
    static let app = URL(string: "actualbudget://")!
    static let budget = URL(string: "actualbudget://budget")!
    static let accounts = URL(string: "actualbudget://accounts")!
    static let addTransaction = URL(string: "actualbudget://transactions/new")!

    static func account(_ id: String) -> URL {
        let encodedId = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? ""
        return URL(string: "actualbudget://accounts/\(encodedId)") ?? accounts
    }
}

enum AmountTint {
    /// Negative amounts in red, everything else in the default text colour.
    case negativeOnly
    /// Negative amounts in red, positive ones in green.
    case signed
}

struct AmountText: View {
    let amount: WidgetSnapshot.Amount
    var font: Font = .body
    var tint: AmountTint = .negativeOnly

    private var color: Color {
        if amount.amount < 0 {
            return WidgetTheme.negative
        }
        if tint == .signed && amount.amount > 0 {
            return WidgetTheme.positive
        }
        return .primary
    }

    var body: some View {
        Text(amount.formatted)
            .font(font.monospacedDigit())
            .fontWeight(.semibold)
            .foregroundStyle(color)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            // Redacted while the device is locked, like the Wallet app.
            .privacySensitive()
    }
}

struct WidgetHeader: View {
    let title: String
    var subtitle: String? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(WidgetTheme.accent)
                .textCase(.uppercase)
                .lineLimit(1)
            if let subtitle = subtitle {
                Spacer(minLength: 6)
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }
}

/// Shown until the app has written a snapshot. Tapping opens the app.
struct EmptyStateView: View {
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetHeader(title: title)
            Spacer(minLength: 0)
            Text("Open Actual to show your budget here.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(WidgetLink.app)
    }
}

/// Shown on the lock screen until the app has written a snapshot.
struct AccessoryEmptyStateView: View {
    var body: some View {
        Text("Open Actual")
            .font(.caption)
            .widgetURL(WidgetLink.app)
    }
}

extension View {
    /// Widget background that works on iOS 16 and the iOS 17 container API.
    /// Pass `.clear` for lock screen (accessory) families.
    @ViewBuilder
    func widgetBackground(_ color: Color = Color(.systemBackground)) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { color }
        } else {
            padding()
                .background(color)
        }
    }
}

extension WidgetFamily {
    var isAccessory: Bool {
        switch self {
        case .accessoryInline, .accessoryCircular, .accessoryRectangular:
            return true
        default:
            return false
        }
    }
}
