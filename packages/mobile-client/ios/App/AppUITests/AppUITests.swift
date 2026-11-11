import XCTest

final class AppUITests: XCTestCase {

    // Launches the app and waits for the first screen of the web app to
    // render, which fails if the native shell or the web bundle does not start.
    func testAppLoads() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(
            app.webViews.buttons["Start budgeting"].waitForExistence(timeout: 120),
            "The welcome screen did not appear"
        )
    }

}
