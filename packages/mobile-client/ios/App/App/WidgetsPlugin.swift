import Capacitor
import Foundation
import WidgetKit

/// Bridge between the web app and the home screen widgets (the ActualWidgets
/// extension). The web app sends a JSON snapshot of the data the widgets
/// show; this plugin stores it in the shared app group and asks WidgetKit to
/// redraw. It also forwards the deep links the widgets open the app with, so
/// the web app can navigate to the right page.
///
/// Used from packages/desktop-client/src/components/mobile/widgets/homeScreenWidgetsPlugin.ts.
@objc(WidgetsPlugin)
public class WidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetsPlugin"
    public let jsName = "HomeScreenWidgets"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSnapshot", returnType: CAPPluginReturnPromise),
    ]

    /// Must match `WidgetStore` in the ActualWidgets extension.
    private static let appGroup = "group.com.actualbudget.actual"
    private static let snapshotKey = "widgetSnapshot"

    @objc override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOpenURL(_:)),
            name: Notification.Name.capacitorOpenURL,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc func updateSnapshot(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot"), let data = snapshot.data(using: .utf8) else {
            call.reject("snapshot must be a JSON string")
            return
        }
        guard (try? JSONSerialization.jsonObject(with: data)) is [String: Any] else {
            call.reject("snapshot is not a JSON object")
            return
        }
        guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("App group \(Self.appGroup) is not available")
            return
        }
        defaults.set(data, forKey: Self.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clearSnapshot(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("App group \(Self.appGroup) is not available")
            return
        }
        defaults.removeObject(forKey: Self.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    /// Posted by Capacitor's ApplicationDelegateProxy for every URL the app
    /// is opened with, including the widgets' `actualbudget://` links. The
    /// event is retained until the web app subscribes, which covers a cold
    /// start from a widget tap.
    @objc private func handleOpenURL(_ notification: Notification) {
        guard let object = notification.object as? [String: Any], let url = object["url"] as? URL else {
            return
        }
        notifyListeners("urlOpen", data: ["url": url.absoluteString], retainUntilConsumed: true)
    }
}
