import LocalAuthentication
import UIKit

// Optional lock that asks for Face ID, Touch ID or the device passcode before
// the app can be used: at launch and every time it returns from the
// background. The setting lives in UserDefaults rather than in the web app's
// storage so the lock is enforced here, before any of the web app is shown.
//
// While the lock is turned on the app is also covered whenever it is not
// active, which keeps budget data out of the app switcher.
final class AppLock {

    static let shared = AppLock()

    private static let enabledKey = "appLockEnabled"

    private var coverWindow: UIWindow?
    private var isLocked = false
    private var isAuthenticating = false
    // The system prompt is shown once each time the app comes to the
    // foreground. The prompt itself makes the scene inactive and then active
    // again, so prompting on every activation would bring it straight back
    // after the user cancels it; from then on they use the Unlock button.
    private var shouldPromptWhenActive = false
    // Counts the times the app was locked, so that the answer to a prompt
    // from before the latest lock cannot unlock it.
    private var lockGeneration = 0

    private init() {}

    private(set) var isEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: AppLock.enabledKey) }
        set { UserDefaults.standard.set(newValue, forKey: AppLock.enabledKey) }
    }

    // MARK: - Status reported to the web app

    var status: [String: Any] {
        [
            "isAvailable": LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil),
            "isEnabled": isEnabled,
            "biometry": AppLock.biometry
        ]
    }

    // The biometry that would be offered before the passcode, if any is set up.
    private static var biometry: String {
        let context = LAContext()
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else {
            return "none"
        }
        if #available(iOS 17.0, *), context.biometryType == .opticID {
            return "opticId"
        }
        switch context.biometryType {
        case .faceID: return "faceId"
        case .touchID: return "touchId"
        default: return "none"
        }
    }

    // Turning the lock on or off asks for authentication first, so the
    // setting cannot be changed by someone who could not unlock the app.
    // Must be called on the main thread; `completion` is called there too.
    func setEnabled(_ enabled: Bool, reason: String, completion: @escaping () -> Void) {
        guard enabled != isEnabled, let context = authenticationContext() else {
            completion()
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, _ in
            DispatchQueue.main.async {
                if success {
                    self.isEnabled = enabled
                }
                completion()
            }
        }
    }

    // A context that can ask for authentication, if the device has a way to.
    private func authenticationContext() -> LAContext? {
        let context = LAContext()
        var error: NSError?
        if context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) {
            return context
        }
        if error?.code == LAError.Code.passcodeNotSet.rawValue {
            // The passcode was removed from the device, which leaves nothing
            // to authenticate with. Removing it takes the passcode itself, so
            // the lock is turned off instead of locking the user out of their
            // budget.
            isEnabled = false
        }
        return nil
    }

    // MARK: - Scene life cycle (called by SceneDelegate)

    func sceneWillConnect(_ scene: UIScene) {
        guard isEnabled else { return }
        lock(in: scene)
    }

    func sceneWillResignActive(_ scene: UIScene) {
        guard isEnabled else { return }
        showCover(in: scene)
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        guard isEnabled else { return }
        // The keyboard is drawn above every window of the app, including the
        // cover, so it has to be put away.
        (scene as? UIWindowScene)?.windows.forEach { $0.endEditing(true) }
        lock(in: scene)
    }

    private func lock(in scene: UIScene) {
        isLocked = true
        lockGeneration += 1
        shouldPromptWhenActive = true
        showCover(in: scene)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        guard isLocked else {
            hideCover()
            return
        }
        if shouldPromptWhenActive {
            shouldPromptWhenActive = false
            unlock()
        }
    }

    // MARK: - Unlocking

    private func unlock() {
        guard isLocked, !isAuthenticating else { return }

        guard let context = authenticationContext() else {
            if !isEnabled {
                isLocked = false
                hideCover()
            }
            return
        }

        isAuthenticating = true
        updateCover()
        let generation = lockGeneration
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock Actual Budget") { success, _ in
            DispatchQueue.main.async {
                self.isAuthenticating = false
                if success, generation == self.lockGeneration {
                    self.isLocked = false
                    self.hideCover()
                } else {
                    self.updateCover()
                }
            }
        }
    }

    // MARK: - Cover

    private func showCover(in scene: UIScene) {
        if coverWindow == nil, let windowScene = scene as? UIWindowScene {
            let window = UIWindow(windowScene: windowScene)
            // Above alerts and share sheets, which would otherwise stay visible.
            window.windowLevel = UIWindow.Level(rawValue: UIWindow.Level.alert.rawValue + 1)
            window.rootViewController = AppLockViewController { [weak self] in self?.unlock() }
            window.isHidden = false
            coverWindow = window
        }
        updateCover()
    }

    private func hideCover() {
        coverWindow?.isHidden = true
        coverWindow = nil
    }

    private func updateCover() {
        (coverWindow?.rootViewController as? AppLockViewController)?
            .setUnlockButtonVisible(isLocked && !isAuthenticating)
    }

}

// What is shown instead of the app while it is locked or not active: the same
// image as the launch screen, plus a button to bring the system prompt back
// after it was cancelled.
private final class AppLockViewController: UIViewController {

    private let onUnlock: () -> Void
    private let unlockButton = UIButton(type: .system)

    init(onUnlock: @escaping () -> Void) {
        self.onUnlock = onUnlock
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let splash = UIImageView(image: UIImage(named: "Splash"))
        splash.contentMode = .scaleAspectFill
        splash.clipsToBounds = true
        splash.frame = view.bounds
        splash.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(splash)

        var configuration = UIButton.Configuration.filled()
        configuration.title = "Unlock"
        configuration.buttonSize = .large
        configuration.cornerStyle = .capsule
        unlockButton.configuration = configuration
        unlockButton.isHidden = true
        unlockButton.addAction(UIAction { [weak self] _ in self?.onUnlock() }, for: .primaryActionTriggered)
        unlockButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(unlockButton)
        NSLayoutConstraint.activate([
            unlockButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            unlockButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -48)
        ])
    }

    func setUnlockButtonVisible(_ isVisible: Bool) {
        loadViewIfNeeded()
        unlockButton.isHidden = !isVisible
    }

}
