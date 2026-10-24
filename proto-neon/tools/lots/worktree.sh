#!/usr/bin/env bash
# tools/lots/worktree.sh — une copie isolée par lot (REFONTE.md § 8.1), sa page d'essai, et le retour des
# fichiers dans l'arbre d'intégration. Huit agents qui construisent dans le même arbre s'écraseraient la
# sortie et embarqueraient les fichiers à moitié écrits des autres : chaque lot travaille dans SA copie.
#
#   tools/lots/worktree.sh creer L3a [commit]   ../wt/L3a sur la branche lot/L3a, depuis le commit du contrat
#                                               (HEAD par défaut) ; crée tools/L3a/ et construit la page d'essai
#   tools/lots/worktree.sh essai L3a            reconstruit tools/L3a/index.html dans la copie
#   tools/lots/worktree.sh servir L3a           sert la copie en http (port 8120 + rang du lot)
#   tools/lots/worktree.sh verifier L3a         liste les fichiers changés depuis la base et refuse ceux qui
#                                               n'appartiennent pas au lot (tools/lots/lots.json)
#   tools/lots/worktree.sh integrer L3a         recopie les fichiers du lot dans l'arbre d'intégration (sans
#                                               commiter : l'orchestrateur relit, construit, commite)
#   tools/lots/worktree.sh supprimer L3a        retire la copie (la branche reste)
#
# Le lot ne commite pas ; il ne touche que ses fichiers de src/, son dossier tools/<lot>/ et son rapport
# refonte/lots/<lot>.md. Jamais rien hors de proto-neon/, jamais snake2030/.
set -euo pipefail

ACTION="${1:-}"; LOT="${2:-}"
if [[ -z "$ACTION" ]]; then sed -n '2,18p' "$0"; exit 2; fi
if [[ "$ACTION" =~ ^L ]]; then LOT="$ACTION"; ACTION="creer"; fi
if [[ -z "$LOT" ]]; then echo "worktree.sh : nom de lot attendu (L1, L2, L3a…)" >&2; exit 2; fi

RACINE="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
WT="$(dirname "$RACINE")/wt/$LOT"
NODE="${NODE:-$(command -v node || echo /opt/node22/bin/node)}"
LOTS="$RACINE/proto-neon/tools/lots/lots.json"

possede() {   # possede LOT chemin-relatif-à-proto-neon -> 0 si le lot peut toucher ce fichier
  "$NODE" -e '
    const L = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")), lot = process.argv[2], f = process.argv[3];
    const a = (L[lot] || []).concat(["tools/" + lot + "/", "refonte/lots/" + lot + ".md"]);
    process.exit(a.some(p => p.endsWith("/") ? f.startsWith(p) : f === p) ? 0 : 1);' "$LOTS" "$LOT" "$1"
}
changes() {   # fichiers changés dans la copie depuis la base de la branche (commités ou non), relatifs à la racine
  local base; base="$(git -C "$WT" merge-base HEAD "$(git -C "$RACINE" rev-parse HEAD)" 2>/dev/null || git -C "$WT" rev-parse HEAD)"
  { git -C "$WT" diff --name-only "$base"; git -C "$WT" ls-files --others --exclude-standard; } | sort -u
}
rang() { "$NODE" -e 'const k = Object.keys(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))).filter(x => x !== "_"); console.log(Math.max(0, k.indexOf(process.argv[2])));' "$LOTS" "$LOT"; }

case "$ACTION" in
  creer)
    COMMIT="${3:-HEAD}"
    if [[ -d "$WT" ]]; then echo "worktree.sh : $WT existe déjà" >&2; exit 1; fi
    git -C "$RACINE" worktree add "$WT" -b "lot/$LOT" "$COMMIT"
    mkdir -p "$WT/proto-neon/tools/$LOT"
    (cd "$WT/proto-neon" && "$NODE" build.mjs "tools/$LOT/index.html" >/dev/null)
    echo "copie : $WT (branche lot/$LOT, depuis $COMMIT)"
    echo "page d'essai : $WT/proto-neon/tools/$LOT/index.html — tools/lots/worktree.sh servir $LOT"
    ;;
  essai)
    (cd "$WT/proto-neon" && "$NODE" build.mjs "tools/$LOT/index.html")
    ;;
  servir)
    PORT=$((8120 + $(rang)))
    echo "http://127.0.0.1:$PORT/proto-neon/tools/$LOT/index.html"
    cd "$WT" && exec "$NODE" "$(dirname "$NODE")/../lib/node_modules/http-server/bin/http-server" -p "$PORT" -s
    ;;
  verifier)
    MAUVAIS=0
    while read -r f; do
      [[ -z "$f" ]] && continue
      if [[ "$f" != proto-neon/* ]]; then echo "  HORS DE proto-neon/ : $f"; MAUVAIS=1; continue; fi
      r="${f#proto-neon/}"
      if [[ "$r" == tools/*/index.html || "$r" == *.png ]]; then continue; fi       # pages d'essai et captures : jamais livrées
      if possede "$r"; then echo "  ok        $f"; else echo "  REFUSÉ    $f (n'appartient pas à $LOT)"; MAUVAIS=1; fi
    done < <(changes)
    exit $MAUVAIS
    ;;
  integrer)
    "$0" verifier "$LOT" || { echo "worktree.sh : des fichiers n'appartiennent pas à $LOT, rien n'est recopié" >&2; exit 1; }
    while read -r f; do
      [[ -z "$f" ]] && continue
      r="${f#proto-neon/}"
      if [[ "$r" == tools/*/index.html || "$r" == *.png ]]; then continue; fi
      if [[ -e "$WT/$f" ]]; then mkdir -p "$(dirname "$RACINE/$f")"; cp "$WT/$f" "$RACINE/$f"; echo "  recopié   $f"
      else echo "  supprimé dans la copie (à retirer à la main s'il le faut) : $f"; fi
    done < <(changes)
    echo "intégration de $LOT recopiée : construire, lancer tools/nonreg/nonreg.mjs, relire, commiter"
    ;;
  supprimer)
    git -C "$RACINE" worktree remove "$WT"
    ;;
  *) echo "worktree.sh : action inconnue « $ACTION »" >&2; exit 2 ;;
esac
