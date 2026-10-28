import Capacitor
import Foundation

/// Forwards the deep links the home screen widgets (the ActualWidgets
/// extension) open the app with, so the web app can navigate to the right
/// page.
///
/// Used from packages/desktop-client/src/components/mobile/widgets/homeScreenWidgetsPlugin.ts.
@objc(WidgetsPlugin)
public class WidgetsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetsPlugin"
    public let jsName = "HomeScreenWidgets"
    public let pluginMethods: [CAPPluginMethod] = []

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
