import XCTest

final class SafariFlow: XCTestCase {
    @MainActor func testFiveEpochArcade() throws {
        continueAfterFailure = false
        let raw = try XCTUnwrap(ProcessInfo.processInfo.environment["SNAKE_PUBLIC_URL"])
        let url = try XCTUnwrap(URL(string: raw))
        XCTAssertTrue(url.scheme == "https" || (url.scheme == "http" && ["127.0.0.1","localhost"].contains(url.host ?? "")))
        let device = XCUIDevice.shared
        let original = device.orientation
        if [.landscapeRight, .portrait, .portraitUpsideDown].contains(original) {
            addTeardownBlock { @MainActor in XCUIDevice.shared.orientation = original }
        }
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        device.orientation = .landscapeLeft
        device.system.open(url)
        XCTAssertTrue(safari.wait(for:.runningForeground, timeout:15))
        let web = safari.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout:20))
        func button(_ name:String) -> XCUIElement { web.descendants(matching:.button).matching(identifier:name).firstMatch }
        func snap(_ name:String){
            let picture = XCTAttachment(screenshot:web.screenshot())
            picture.name=name
            picture.lifetime = .keepAlways
            add(picture)
        }
        let silent = button("Jouer en silence")
        XCTAssertTrue(silent.waitForExistence(timeout:12))
        XCTAssertGreaterThan(web.frame.width,web.frame.height)
        snap("01-Ouverture")
        silent.tap()
        let pause = button("Pause")
        XCTAssertTrue(pause.waitForExistence(timeout:4))
        pause.tap()
        let resume = button("Reprendre")
        XCTAssertTrue(resume.waitForExistence(timeout:4))
        let scores = button("Palmarès")
        XCTAssertTrue(scores.exists)
        scores.tap()
        let close = button("Fermer")
        XCTAssertTrue(close.waitForExistence(timeout:4))
        close.tap()
        resume.tap()
        let replay = button("Revoir l’impact")
        XCTAssertTrue(replay.waitForExistence(timeout:35))
        snap("02-Defaite")
        replay.tap()
        XCTAssertTrue(close.waitForExistence(timeout:4))
        snap("03-Reprise")
        close.tap()
        let jump = button("Saut 1995")
        XCTAssertTrue(jump.waitForExistence(timeout:4))
        jump.tap()
        XCTAssertTrue(silent.waitForExistence(timeout:4))
        XCTAssertTrue(web.staticTexts.containing(NSPredicate(format:"label CONTAINS %@", "8 bits")).firstMatch.exists)
        silent.tap()
        XCTAssertTrue(pause.waitForExistence(timeout:4))
        snap("04-Arcade-8-bits")
        pause.tap()
        XCTAssertTrue(resume.waitForExistence(timeout:4))
    }
}
