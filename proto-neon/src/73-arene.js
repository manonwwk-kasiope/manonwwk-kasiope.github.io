/* ===== 73-arene.js — N.arene : les événements d'arène (TRAVELLING, voies et convois, SILLAGE) =====

   SQUELETTE DU LOT 0b (contrat 1.0). Propriétaires : lots 5a (TRAVELLING) et 5b (convois, SILLAGE).
     travelling(vx, depuis)  annonce l'arène qui voyage (événement arene/travellingAnnonce), puis, après
                             N.R.monde.mobile.annonceVoyage secondes, la lance par N.world.travelling et
                             émet arene/travelling ; arene/fin quand elle s'arrête au bord du monde ;
     convois(cfg)            repli : la configuration est retenue, aucun convoi ne passe (lot 5b) ;
     voies() -> []           les voies en cours (miroir S.voies, même tableau) ;
     sillage(x, y) -> false  repli : pas de sillage ;
     actif()                 vrai pendant un TRAVELLING annoncé ou en cours.
   Les collisions des convois avec la joueuse (N.joueuse.hitTest, tuer, couper) seront ici (lot 5b). */
(function () {
  'use strict';
  var N = (typeof window !== 'undefined') ? (window.__N || (window.__N = {}))
    : (typeof globalThis !== 'undefined' ? (globalThis.__N || (globalThis.__N = {})) : {});

  var voies = [];
  var A = { annonce: null, reste: 0, enCours: false, convois: null };

  function emettre(evt, vx) { if (N.ev) N.ev.emit('arene', { evt: evt, voie: -1, vx: +vx || 0 }); }

  var arene = {
    reset: function () {
      voies.length = 0; A.annonce = null; A.reste = 0; A.enCours = false; A.convois = null;
      var s = N.S; if (s) s.voies = voies;
    },
    update: function (dt) {
      if (!(dt > 0)) return;
      if (A.annonce) {
        A.reste -= dt;
        if (A.reste <= 0) {
          var o = A.annonce; A.annonce = null; A.enCours = true;
          if (N.world && N.world.travelling) N.world.travelling(o);
          emettre('travelling', o.vx);
        }
      } else if (A.enCours && N.world && !N.world.enMouvement()) { A.enCours = false; emettre('fin', 0); }
    },
    draw: function () { /* repli : les voies et les convois se dessinent au lot 5b */ },
    travelling: function (vx, depuis) {
      var M = N.R && N.R.monde, lg = (M && M.travelling && M.travelling.largeur) || 576;
      A.annonce = { largeur: lg, vx: +vx || 8, depuis: depuis === undefined ? 'gauche' : depuis };
      A.reste = (M && M.mobile && M.mobile.annonceVoyage) || 2;
      emettre('travellingAnnonce', vx);
    },
    convois: function (cfg) { A.convois = cfg || null; },
    voies: function () { return voies; },
    sillage: function () { return false; },
    actif: function () { return !!(A.annonce || A.enCours); }
  };
  N.arene = arene;
})();
