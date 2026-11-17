(() => {
  const morceaux = [
    { titre: "Neon Velocity", chemin: "../snake2030/neonvelocity-2.mp3" },
    { titre: "electro-tension", chemin: "../proto-neon/musique/morceaux/electro-tension.mp3" },
    { titre: "electro-calme", chemin: "../proto-neon/musique/morceaux/electro-calme.mp3" },
  ];

  function initialiser() {
    const zone = document.getElementById("ecoute");
    if (!zone) return;

    const titre = document.createElement("p");
    titre.id = "titre-ecoute";
    zone.append(titre);
    let lecteur;

    function afficher(index) {
      const morceau = morceaux[index];
      if (!morceau) return;
      if (lecteur) {
        lecteur.pause();
        lecteur.removeAttribute("src");
        lecteur.load();
        lecteur.remove();
      }

      titre.textContent = morceau.titre;
      lecteur = document.createElement("audio");
      lecteur.controls = true;
      lecteur.preload = "none";
      lecteur.setAttribute("aria-labelledby", titre.id);
      lecteur.src = morceau.chemin;
      zone.append(lecteur);
    }

    const selecteur = "#serpents2975 select";
    afficher(document.querySelector(selecteur)?.selectedIndex ?? 0);
    document.addEventListener("change", (evenement) => {
      if (evenement.target.matches(selecteur)) afficher(evenement.target.selectedIndex);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiser, { once: true });
  } else {
    initialiser();
  }
})();
