import XCTest

final class SafariFlow: XCTestCase {
    @MainActor func testChargePaysage() async throws {
        continueAfterFailure = false
        executionTimeAllowance = 300
        let raw = try XCTUnwrap(ProcessInfo.processInfo.environment["SNAKE_PUBLIC_URL"])
        let url = try XCTUnwrap(URL(string: raw))
        XCTAssertEqual(url.scheme, "http")
        XCTAssertEqual(url.host, "127.0.0.1")
        let device = XCUIDevice.shared
        let original = device.orientation
        if [.portrait, .portraitUpsideDown, .landscapeRight].contains(original) {
            addTeardownBlock { @MainActor in XCUIDevice.shared.orientation = original }
        }
        device.orientation = .landscapeLeft
        device.system.open(url)
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 20))
        let web = safari.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 20))
        XCTAssertGreaterThan(web.frame.width, web.frame.height)
        // No screenshots or accessibility polling during timing windows.
        try await Task.sleep(for: .seconds(164))
        let done = web.descendants(matching: .any).matching(NSPredicate(format:"label CONTAINS[c] %@ OR value CONTAINS[c] %@", "Mesure terminée", "Mesure terminée")).firstMatch
        XCTAssertTrue(done.waitForExistence(timeout: 50))
    }
}
