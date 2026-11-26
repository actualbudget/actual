import UIKit
import Capacitor

// Apps built with the iOS 27 SDK must use the scene life cycle or they do not
// launch. The window comes from Main.storyboard (see UIApplicationSceneManifest
// in Info.plist); URL opens are forwarded to Capacitor so the App plugin keeps
// receiving them.
class SceneDelegate: UIResponder, UIWindowSceneDelegate, UIGestureRecognizerDelegate {

    var window: UIWindow?
    private var backSwipe: UIScreenEdgePanGestureRecognizer?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    // Swiping in from the left screen edge goes back. WKWebView's own gesture
    // (allowsBackForwardNavigationGestures) is not used: it does not fire when
    // the swipe starts on the scrolling lists that fill nearly every screen,
    // only on a page header. A recognizer attached to the web view is held
    // back the same way, hence the window.
    func sceneDidBecomeActive(_ scene: UIScene) {
        guard backSwipe == nil, let window = window else {
            return
        }
        // ponytail: left edge only; mirror to the right edge if the app gains a right-to-left layout.
        let swipe = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(goBackAfterEdgeSwipe(_:)))
        swipe.edges = .left
        swipe.delegate = self
        window.addGestureRecognizer(swipe)
        backSwipe = swipe
    }

    // Lets the swipe run alongside the page's own scrolling and touch handling
    // instead of waiting for them to give up.
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        return true
    }

    @objc private func goBackAfterEdgeSwipe(_ swipe: UIScreenEdgePanGestureRecognizer) {
        // A swipe that ends back near the edge, or moving back towards it, is
        // a change of mind.
        guard swipe.state == .ended,
              swipe.translation(in: swipe.view).x >= 50,
              swipe.velocity(in: swipe.view).x >= 0 else {
            return
        }
        (window?.rootViewController as? CAPBridgeViewController)?.webView?.goBack()
    }

}
