import XCTest

final class Accueil: XCTestCase {
    @MainActor func testEcranAccueil() throws {
        continueAfterFailure = false
        let env = ProcessInfo.processInfo.environment
        XCTAssertNotNil(env["SIMULATOR_UDID"])
        let url = try XCTUnwrap(URL(string: try XCTUnwrap(env["SNAKE_PUBLIC_URL"])))
        XCTAssertEqual(url.scheme, "http"); XCTAssertEqual(url.host, "127.0.0.1")
        XCTAssertEqual(url.query, "muet=1")
        let tag = try XCTUnwrap(env["SNAKE_QA_NAME"])
        XCTAssertNotNil(tag.range(of: "^S2985QA[0-9A-F]{4}$", options: .regularExpression))
        let device = XCUIDevice.shared, safari = XCUIApplication(bundleIdentifier:"com.apple.mobilesafari")
        let board = XCUIApplication(bundleIdentifier:"com.apple.springboard")
        let app = XCUIApplication(bundleIdentifier:"com.apple.webapp")
        let original = device.orientation
        defer { if original != .unknown { device.orientation = original } }
        func label(_ app: XCUIApplication, _ pattern: String) -> XCUIElement {
            app.descendants(matching: .any).matching(NSPredicate(format:"label MATCHES[cd] %@", pattern)).firstMatch
        }
        func press(_ app: XCUIApplication, _ pattern: String, _ stage: String) throws {
            let item = label(app, pattern)
            guard item.waitForExistence(timeout: 5) else {
                let tree = XCTAttachment(string: app.debugDescription)
                tree.name = stage; tree.lifetime = .keepAlways; add(tree)
                XCTFail(stage); throw NSError(domain:"AccueilQA", code:1)
            }
            item.tap()
        }
        let icon = board.icons.matching(identifier:tag).firstMatch
        device.orientation = .portrait; device.press(.home)
        XCTAssertFalse(icon.exists, "Ce nom doit être neuf.")
        safari.terminate()
        device.system.open(url)
        XCTAssertTrue(safari.wait(for:.runningForeground, timeout:20))
        XCTAssertTrue(label(safari,"Passe en paysage.").waitForExistence(timeout:40))
        device.orientation = .landscapeLeft
        XCTAssertTrue(label(safari,"Jouer en silence").waitForExistence(timeout:12))
        device.orientation = .portrait
        let share = label(safari,"Share|Partager")
        if !share.exists {try press(safari,"More|More Options|Plus|Plus d.options|Page Menu|Menu de la page","Menu Safari")}
        try press(safari,"Share|Partager","Partager")
        let addHome = label(safari,"Add to Home Screen|Sur l.écran d.accueil|Ajouter à l.écran d.accueil")
        let expanded = label(safari,"En voir plus|Show More|View More")
        if expanded.waitForExistence(timeout:2) { expanded.tap() }
        for _ in 0..<4 {
            if addHome.exists && addHome.isHittable {break}
            safari.swipeUp()
        }
        try press(safari,"Add to Home Screen|Sur l.écran d.accueil|Ajouter à l.écran d.accueil","Action écran d’accueil")
        let name = safari.textFields.matching(NSPredicate(format:"value == %@", tag)).firstMatch
        XCTAssertTrue(name.waitForExistence(timeout:5))
        XCTAssertEqual(name.value as? String,tag,"Titre QA exact avant création")
        let asApp = safari.switches.matching(NSPredicate(format:"label MATCHES[cd] %@", "Open as Web App|Ouvrir (comme |en tant qu.)(une )?(app|application) web")).firstMatch
        if asApp.exists && (asApp.value as? String) == "0" {asApp.tap()}
        try press(safari,"Add|Ajouter","Confirmer ajout QA")
        // Le nom aléatoire a été contrôlé avant l'unique création. Aucune autre icône ne peut être supprimée.
        addTeardownBlock { @MainActor in
            device.orientation = .portrait; device.press(.home)
            guard icon.waitForExistence(timeout:6) else {
                XCTFail("Raccourci QA introuvable pour le nettoyage : "+tag);return
            }
            icon.press(forDuration:1.3)
            try press(board,"Delete Bookmark|Delete Web App|Remove App|Supprimer le signet|Supprimer l.app web|Supprimer l.app","Retirer le raccourci QA "+tag)
            try press(board,"Delete|Supprimer","Confirmer la suppression QA")
            XCTAssertTrue(icon.waitForNonExistence(timeout:8))
        }
        if !icon.waitForExistence(timeout:6) {device.press(.home)}
        XCTAssertTrue(icon.waitForExistence(timeout:6));icon.tap()
        XCTAssertTrue(app.wait(for:.runningForeground, timeout:15),"Processus Web.app en premier plan")
        let scene = label(app, "Passe en paysage.|Jouer en silence")
        XCTAssertTrue(scene.waitForExistence(timeout:35),"Document autonome chargé avant rotation")
        device.orientation = .landscapeLeft
        if !label(app,"Jouer en silence").waitForExistence(timeout:8) {
            device.orientation = .portrait
            device.orientation = .landscapeRight
        }
        try press(app,"Jouer en silence","Départ autonome")
        XCTAssertTrue(label(app,"Son verrouillé par le lien").waitForExistence(timeout:5))
        let picture = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        picture.name = "Arène-paysage-autonome";picture.lifetime = .keepAlways;add(picture)
        // Le point d'activation AX de Web.app peut se trouver hors de son bouton
        // en paysage. Taper au centre mesuré de la commande avec un événement natif.
        let pause = label(app,"Pause")
        XCTAssertTrue(pause.exists)
        let surface = app.webViews.firstMatch
        let bounds = surface.frame, control = pause.frame
        XCTAssertTrue(bounds.contains(CGPoint(x:control.midX,y:control.midY)))
        let point = CGVector(dx:(control.midX-bounds.minX)/bounds.width,dy:(control.midY-bounds.minY)/bounds.height)
        surface.coordinate(withNormalizedOffset:point).tap()
        XCTAssertTrue(label(app,"Reprendre").waitForExistence(timeout:8))
    }
}
