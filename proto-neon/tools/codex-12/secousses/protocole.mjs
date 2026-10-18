/* Protocole actuel de R14 : même sonde.simulerPartie, observation après N.cam.update. */
export function partie({pilote,graine,maxT=540}) {
 const N=window.__N,S=window.__S; localStorage.clear();N.intro.skip();N.horloge.avancer();
 return window.__MESURE.simulerPartie({pilote,graine,maxT,pas:0.25,jour:20261017,god:pilote==='dieu',actions:pilote==='humain'?'auto':'doigts'});
}
