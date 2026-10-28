import Capacitor
import UIKit

/// The storyboard's root view controller. Registers the plugins that live in
/// this app rather than in a Capacitor package.
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetsPlugin())
    }
}
