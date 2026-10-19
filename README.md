# Punktestand

Ein einfacher Punktezähler für 2–8 Spieler. Direkt als statische HTML-Datei nutzbar, ohne Build-Prozess und ohne Produktionsabhängigkeiten.

## GitHub Pages

Einmalig im Repository **Settings → Pages → Build and deployment** einstellen:

- **Source:** Deploy from a branch
- **Branch:** main
- **Folder:** /(root)
- **Save**

Danach veröffentlicht GitHub Änderungen auf `main` automatisch. Die vorgesehene Adresse ist **https://sl3ndrr.github.io/punktestand/**. Sie ist erst nach der Aktivierung und dem erfolgreichen Pages-Lauf erreichbar.

## Bedienung

- Spieler direkt umbenennen, mit **+ / −** zählen oder einen eigenen Betrag anwenden.
- **Zurück** nimmt die letzte Punkteänderung bzw. das Hinzufügen/Entfernen eines Spielers zurück.
- **Neue Runde** zeigt Ergebnis und Punkteverlauf; erst **Neue Runde starten** setzt Punkte zurück.
- Niedrigste oder höchste Punktzahl gewinnt; Hell-/Dunkelmodus und Vollbild werden unterstützt, soweit der Browser dies anbietet.

Spielstände bleiben ausschließlich im `localStorage` des jeweiligen Browsers. Es gibt keine Synchronisierung zwischen Geräten. Bereits in der bisherigen lokalen HTML-Datei gespeicherte Spielstände werden nicht automatisch zur Pages-Adresse übertragen. Wenn Browser-Speicherung fehlschlägt, erscheint ein Hinweis.

## Tablets

Ab 700 CSS-Pixeln werden Karten und Bedienelemente an die Spielerzahl angepasst. Ab 1000 Pixeln passen drei Karten nebeneinander; ab 1100 Pixeln werden bei 7–8 Spielern vier Spalten verwendet. Die Fläche ist bis 1800 Pixel breit nutzbar. Punktzahlen skalieren mit ihrer Kartenbreite und Stellenzahl. Es wird nach dem tatsächlich verfügbaren Browserbereich entschieden, nicht nach Gerätebezeichnungen.

## Prüfung

Der GitHub-Actions-Workflow prüft Bedienung, Speicherung, fehlerhafte Daten, Tastaturfokus und 56 Layout-Kombinationen einschließlich 820×1180, 834×1194 sowie der jeweiligen Querformate. Screenshots und Messwerte liegen nach einem erfolgreichen Lauf im Actions-Artefakt `tablet-pruefung`.

Lokal mit Node.js 24:

```sh
npm install --no-save --ignore-scripts playwright@1.62.1
npx playwright install chromium
node tests/browser.cjs
```

Produktiv wird ausschließlich `index.html` benötigt. Weitere Prüfergebnisse und mögliche Folgeschritte stehen in [CODE_REVIEW.md](CODE_REVIEW.md).
