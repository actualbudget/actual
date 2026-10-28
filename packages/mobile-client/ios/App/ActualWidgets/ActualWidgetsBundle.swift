import SwiftUI
import WidgetKit

// Home screen and lock screen widgets for the iOS app. They show data the
// web app writes through the `HomeScreenWidgets` Capacitor plugin (see
// App/WidgetsPlugin.swift); tapping one opens the app at the matching page.
@main
struct ActualWidgetsBundle: WidgetBundle {
    var body: some Widget {
        BudgetWidget()
        AccountsWidget()
        AddTransactionWidget()
    }
}
