#!/bin/sh
# Abhaengigkeiten installieren und aus dem iCloud-Sync nehmen.
#
# Das Projekt liegt unter ~/Documents und wird damit von iCloud synchronisiert.
# node_modules sind mehrere tausend kleine Dateien; schreibt npm sie, waehrend
# iCloud sie hochlaedt, entstehen Duplikate mit " 2" im Namen und einzelne
# Module haengen beim Laden. Genau das ist schon passiert.
#
# iCloud ueberspringt alles, was auf .nosync endet. npm ersetzt einen
# vorhandenen Symlink allerdings bei jeder Installation durch ein echtes
# Verzeichnis — deshalb wird erst installiert und danach umgehaengt.
set -e
cd "$(dirname "$0")/.."

fuer_ordner() {
  ordner="$1"
  ( cd "$ordner" || exit 0
    [ -f package.json ] || exit 0
    rm -rf node_modules.nosync
    [ -L node_modules ] && rm node_modules
    npm ci --silent
    mv node_modules node_modules.nosync
    ln -s node_modules.nosync node_modules
    echo "  $ordner: $(ls node_modules/ | wc -l | tr -d ' ') Pakete, ausserhalb des Sync" )
}

echo "Abhaengigkeiten installieren und vom iCloud-Sync ausnehmen"
fuer_ordner .
fuer_ordner api
echo "Fertig. Bei Problemen einfach erneut ausfuehren: npm run deps"
