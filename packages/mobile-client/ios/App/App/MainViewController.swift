import Capacitor

// The bridge view controller named in Main.storyboard. Plugins that come from
// pods register themselves; the ones written in this app are added here.
class MainViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppLockPlugin())
    }

}
