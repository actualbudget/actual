import SwiftUI
import WidgetKit

// Home screen and lock screen widgets for the iOS app. They open the app
// with `actualbudget://` links, which the `HomeScreenWidgets` plugin (see
// App/WidgetsPlugin.swift) forwards to the web app.
@main
struct ActualWidgetsBundle: WidgetBundle {
    var body: some Widget {
        AddTransactionWidget()
    }
}
