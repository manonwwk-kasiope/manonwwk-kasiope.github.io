import XCTest
final class SafariFlow:XCTestCase {
    @MainActor func testPremiersInstants() async throws {
        continueAfterFailure = false
        let raw = try XCTUnwrap(ProcessInfo.processInfo.environment["SNAKE_PUBLIC_URL"])
        let url = try XCTUnwrap(URL(string:raw))
        XCTAssertEqual(url.scheme,"http");XCTAssertEqual(url.host,"127.0.0.1");XCTAssertEqual(url.query,"muet=1")
        let device=XCUIDevice.shared, safari=XCUIApplication(bundleIdentifier:"com.apple.mobilesafari")
        let orientation=device.orientation
        defer { if orientation != .unknown {device.orientation=orientation} }
        device.orientation = .landscapeLeft
        device.system.open(url)
        XCTAssertTrue(safari.wait(for:.runningForeground,timeout:20))
        let web=safari.webViews.firstMatch
        func node(_ pattern:String)->XCUIElement {
            web.descendants(matching:.any).matching(NSPredicate(format:"label MATCHES %@",pattern)).firstMatch
        }
        func press(_ pattern:String) {
            let target=node(pattern)
            XCTAssertTrue(target.waitForExistence(timeout:35),pattern);target.tap()
        }
        for year in [1976,2985] {
            XCTAssertTrue(node(String(year)+" · .*").waitForExistence(timeout:30))
            XCTAssertFalse(node("Avec musique").exists)
            press("Jouer en silence")
            // Aucun instantané, geste ou sondage d’accessibilité pendant la fenêtre de mesure.
            try await Task.sleep(for:.seconds(4))
            if year==1976 {
                press("2985, 32 bits,.*");press("Sauter en 2985")
            }
        }
    }
}
