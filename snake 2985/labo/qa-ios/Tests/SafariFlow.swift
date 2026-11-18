import XCTest

final class SafariFlow: XCTestCase {
    @MainActor func testFiveEpochArcade() throws {
        continueAfterFailure = false
        let raw = try XCTUnwrap(ProcessInfo.processInfo.environment["SNAKE_PUBLIC_URL"])
        let parts = try XCTUnwrap(URLComponents(string: raw))
        let local = ["127.0.0.1", "localhost", "::1"].contains(parts.host ?? "")
        XCTAssertTrue(parts.scheme == "https" || (parts.scheme == "http" && local))
        let mute = (parts.queryItems ?? []).filter { $0.name == "muet" }
        XCTAssertFalse(mute.isEmpty)
        XCTAssertTrue(mute.allSatisfy { $0.value == "1" })
        let url = try XCTUnwrap(parts.url)
        let device = XCUIDevice.shared
        let original = device.orientation
        if [.portrait, .landscapeLeft, .landscapeRight, .portraitUpsideDown].contains(original) {
            addTeardownBlock { @MainActor in XCUIDevice.shared.orientation = original }
        }
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        device.orientation = .portrait
        device.system.open(url)
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 20))
        let web = safari.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 30))
        func button(_ name: String) -> XCUIElement {
            web.descendants(matching: .button).matching(identifier: name).firstMatch
        }
        func named(_ name: String, prefix: Bool = false) -> XCUIElement {
            let predicate = NSPredicate(format: prefix ? "label BEGINSWITH[c] %@" : "label ==[c] %@", name)
            return web.descendants(matching: .any).matching(predicate).firstMatch
        }
        func snap(_ name: String) {
            let picture = XCTAttachment(screenshot: web.screenshot())
            picture.name = name
            picture.lifetime = .keepAlways
            add(picture)
        }
        func requireGeometry(landscape: Bool, file: StaticString = #filePath, line: UInt = #line) {
            let geometry = NSPredicate { _, _ in
                let b = web.frame
                return b.width > 0 && b.height > 0 && (landscape ? b.width > b.height : b.height > b.width)
            }
            let result = XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: geometry, object: nil)], timeout: 8)
            XCTAssertEqual(result, .completed, file: file, line: line)
        }

        let portrait = named("Passe en paysage.")
        XCTAssertTrue(portrait.waitForExistence(timeout: 60))
        requireGeometry(landscape: false)
        snap("01-Portrait-initial")
        device.orientation = .landscapeLeft
        let atlas = button("Carte des époques")
        XCTAssertTrue(atlas.waitForExistence(timeout: 12))
        requireGeometry(landscape: true)
        let startedIn1976 = named("1976 · 2 bits", prefix: true).exists
        atlas.tap()
        let years = [1976, 1985, 1995, 2185, 2985]
        for (i, year) in years.enumerated() {
            let date = named("\(year), \(1 << (i + 1)) bits,", prefix: true)
            XCTAssertTrue(date.waitForExistence(timeout: 8), "Date absente : \(year)")
        }
        snap("02-Carte-cinq-epoques")
        // Any prior profile can resume in the future. Use the same visible controls as its player.
        if startedIn1976 {
            button("Fermer").tap()
        } else {
            let prepare = button("Préparer 1976 à zéro point")
            if !prepare.exists {
                let date = web.descendants(matching: .any).matching(NSPredicate(format:
                    "label BEGINSWITH[c] %@ AND NOT (label CONTAINS[c] %@)", "1976, 2 bits, accessible", "tableau")).allElementsBoundByIndex
                    .filter { $0.isHittable }.min { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }
                try XCTUnwrap(date, "Onglet individuel 1976").tap()
            }
            XCTAssertTrue(prepare.waitForExistence(timeout: 8))
            XCTAssertTrue(prepare.isEnabled)
            prepare.tap()
        }
        let silent = button("Jouer en silence")
        XCTAssertTrue(silent.waitForExistence(timeout: 10))
        XCTAssertTrue(named("1976 · 2 bits", prefix: true).waitForExistence(timeout: 5))
        XCTAssertFalse(button("Avec musique").exists)
        silent.tap()
        let pause = button("Pause"), locked = named("Son verrouillé par le lien")
        XCTAssertTrue(locked.waitForExistence(timeout: 5))
        XCTAssertFalse(locked.isEnabled)
        XCTAssertEqual(locked.value as? String, "0")
        pause.tap()
        let resume = button("Reprendre")
        XCTAssertTrue(resume.waitForExistence(timeout: 6))
        button("Palmarès").tap()
        let close = button("Fermer")
        XCTAssertTrue(close.waitForExistence(timeout: 6))
        snap("03-Hall-pause")
        device.orientation = .portrait
        XCTAssertTrue(portrait.waitForExistence(timeout: 10))
        requireGeometry(landscape: false)
        snap("04-Portrait-sur-Hall")
        device.orientation = .landscapeLeft
        requireGeometry(landscape: true)
        XCTAssertTrue(close.waitForExistence(timeout: 8))
        XCTAssertTrue(named("Palmarès").exists)
        snap("05-Hall-retrouve")
        close.tap()
        XCTAssertTrue(resume.waitForExistence(timeout: 6))
        resume.tap()

        let replay = web.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Revoir")).firstMatch
        XCTAssertTrue(replay.waitForExistence(timeout: 45))
        snap("06-Defaite-1976")
        replay.tap()
        XCTAssertTrue(close.waitForExistence(timeout: 6))
        XCTAssertTrue(named("Dernière trajectoire").exists)
        snap("07-Reprise")
        close.tap()
        let destination = named("1995, 8 bits,", prefix: true)
        XCTAssertTrue(destination.waitForExistence(timeout: 6))
        destination.tap()
        let jump = button("Sauter en 1995")
        XCTAssertTrue(jump.waitForExistence(timeout: 5))
        jump.tap()
        XCTAssertTrue(silent.waitForExistence(timeout: 8))
        XCTAssertTrue(named("1995 · 8 bits", prefix: true).waitForExistence(timeout: 5))
        XCTAssertFalse(button("Avec musique").exists)
        snap("08-Preparation-1995")
        silent.tap()
        XCTAssertTrue(locked.waitForExistence(timeout: 5))
        XCTAssertFalse(locked.isEnabled)
        XCTAssertEqual(locked.value as? String, "0")
        snap("09-Jeu-1995-verrouille")
        pause.tap()
        XCTAssertTrue(resume.waitForExistence(timeout: 6))
    }
}
