import UIKit
import Capacitor

// Apps built with the iOS 27 SDK must use the scene life cycle or they do not
// launch. The window comes from Main.storyboard (see UIApplicationSceneManifest
// in Info.plist); URL opens are forwarded to Capacitor so the App plugin keeps
// receiving them.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    // WKWebView ships with the edge-swipe back/forward gesture off. The web
    // view only exists once the bridge view controller has loaded its view,
    // which it has by the time the scene becomes active.
    func sceneDidBecomeActive(_ scene: UIScene) {
        (window?.rootViewController as? CAPBridgeViewController)?.webView?.allowsBackForwardNavigationGestures = true
    }

}
