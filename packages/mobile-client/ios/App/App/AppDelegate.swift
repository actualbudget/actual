import BackgroundTasks
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    // Also listed under BGTaskSchedulerPermittedIdentifiers in Info.plist.
    private static let backgroundSyncTaskIdentifier = "org.actualbudget.backgroundSync"

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.backgroundSyncTaskIdentifier, using: .main) { [weak self] task in
            self?.runBackgroundSync(task)
        }
        return true
    }

    // Asks iOS to wake the app at some point to sync. iOS picks the time (if
    // at all: never after a force quit or with Background App Refresh off), so
    // this is best effort.
    func scheduleBackgroundSync() {
        let request = BGAppRefreshTaskRequest(identifier: Self.backgroundSyncTaskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    private func runBackgroundSync(_ task: BGTask) {
        scheduleBackgroundSync()

        var isCompleted = false
        func complete(success: Bool) {
            guard !isCompleted else { return }
            isCompleted = true
            task.setTaskCompleted(success: success)
        }
        task.expirationHandler = {
            DispatchQueue.main.async { complete(success: false) }
        }
        // Right after iOS relaunched the app the web app is still loading, so
        // ask again until it takes the request or the task runs out of time.
        func attempt() {
            guard !isCompleted else { return }
            syncWebApp { didSync in
                if didSync {
                    complete(success: true)
                } else {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: attempt)
                }
            }
        }
        attempt()
    }

    // The sync code and the database live in the web view, so the web app does
    // the work (see useBackgroundSync.ts). Reports false when the web app did
    // not take the request: it cancels the event when it does.
    func syncWebApp(completion: @escaping (_ didSync: Bool) -> Void) {
        let webView = UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.windows.first?.rootViewController as? CAPBridgeViewController }
            .first?.webView
        guard let webView else {
            completion(false)
            return
        }
        webView.callAsyncJavaScript(
            """
            let done;
            const finished = new Promise(resolve => (done = resolve));
            const wasTaken = !window.dispatchEvent(
              new CustomEvent('actual-background-sync', { detail: done, cancelable: true }),
            );
            if (wasTaken) {
              await finished;
            }
            return wasTaken;
            """,
            in: nil,
            in: .page
        ) { result in
            completion((try? result.get()) as? Bool == true)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
