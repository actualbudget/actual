import Capacitor

// Lets the web app's settings page read and change the app lock (see AppLock).
// It lives in the app rather than in a pod, so it is registered by hand in
// MainViewController.
@objc(AppLockPlugin)
class AppLockPlugin: CAPPlugin, CAPBridgedPlugin {

    let identifier = "AppLockPlugin"
    let jsName = "AppLock"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise)
    ]

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve(AppLock.shared.status)
    }

    // Resolves with the resulting status whether or not the user
    // authenticated: a cancelled prompt just leaves the setting as it was.
    @objc func setEnabled(_ call: CAPPluginCall) {
        guard let enabled = call.getBool("enabled"), let reason = call.getString("reason"), !reason.isEmpty else {
            call.reject("\"enabled\" and \"reason\" are required")
            return
        }
        DispatchQueue.main.async {
            AppLock.shared.setEnabled(enabled, reason: reason) {
                call.resolve(AppLock.shared.status)
            }
        }
    }

}
