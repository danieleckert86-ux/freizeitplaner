# Freizeitideen · manuelle Sammlung · 25.10.2026

## Ergebnis

Die App startet ausschließlich die neue manuelle Oberfläche (`main.ts` →
`idea-app.ts`). „Neues“, Katalogabruf, Recherchekarten, Quellenstatistik und
Geschmacksbewertungsoberfläche entfallen. Keine KI, Quellenabfrage oder neue
Recherchepipeline. Aufmachung nach dem freigegebenen Freiraum-Entwurf, Name
„Freizeitideen“. Fünf Ideenbereiche, sieben vorhandene Orts-/Tourengruppen sowie
„Weitere Orte“ und ein lesendes Archiv der bisherigen gemerkten Funde.

Die fünf Fragen verwenden die bestehende lokale Auswahl aus der eigenen
Sammlung: Bedürfnis, bis1h/bis3h/ganzerTag, Energie, drinnen/draußen, Aufwand.
Keine Kalenderabfrage. Bearbeiten, Ergänzen, Entfernen mit Bestätigung,
Favoriten, Suche und private JSON-Sicherung. Mobile Eintragsauswahl klappt
zu, damit auch32Restaurants nicht die Detailansicht nach unten verdrängen.

## Datenbestand erhalten

Keine Produktionsmigration und kein produktiver Schreibtest. Die neue App lädt
dieselbe private `personal_planning`-Zeile `id=shared` über dieselbe Verbindung.
Vorhandene `routines` und `activityStock` behalten IDs, eigene Titel, Einstellungen,
Bewertungen, unbekannte Felder, Quellen-Snapshots und Originalzeitpunkte.
Kalender, Einträge, Essen, Häkchen, Profile und Historien bleiben im vollständigen
Payload. Bestehende einmalige Legacy-Adapter/Marker verhindern das Wiedereinfügen
bereits gelöschter Standardideen und Maps-Orte. Öffnen schreibt nichts.

Frühere Favoriten bleiben unter „Weitere gemerkte Ideen“ lesbar, ohne Ablauf-
oder erneute Empfehlungsprüfung; bereits übernommene Fund-IDs werden dort nicht
doppelt gezeigt. Ausblendungen bleiben wirksam. Scheitert das Laden dieser
Entscheidungen, zeigt die App eine Warnung und unterdrückt source-verknüpfte
Funde; eigene manuelle Einträge bleiben erreichbar. Kein Reset von Bewertungen.

Speichern: vollständige Kopie, bestehende Validierung, `revision`-CAS und
vollständiges bestätigtes SQL-RETURNING. JSONB-Schlüsselreihenfolge ist irrelevant.
Bei Konflikt aktuellen Stand lesen, keine automatische Überschreibung; Formulare
behalten unbestätigte Eingaben. Nach unklarer Netzantwort zuerst neu laden.
Keine automatische Hintergrundaktualisierung während einer Bearbeitung.

Additive optionale private Felder an StockItem: `address`, `linkedRoutineIds`.
Zusätzlicher privater Typ `other` für Kajakstellen, Kulturorte etc. Explizite Links
verwenden Routine-IDs; ohne Links erfolgt die bisherige Gruppenzuordnung.
Kurze/lange Rad- und Wandervarianten verwenden dieselbe Tourensammlung.
Legacy-Kurz-/Lang-Kind bleibt bei bloßer Titelbearbeitung erhalten.
ModuleResultv1 und öffentlicher Katalog werden nicht geändert. Ein älterer noch
geöffneter Client kann `other` nicht bearbeiten und muss neu geladen werden.

## Validierung und Aktivierung

- App:126Tests bestanden, TypeScript und Vite-Produktionsbuild bestanden.
- Isolierter echter Chromium-Test:320/390/1024px;32Orte, lange Titel, mobile
  Auswahl, Bearbeiten/Speichern/Neuladen;3Schreibaktionen ausschließlich im
  Fixture-Arbeitsspeicher,0Produktionsschreibaktionen. Screenshots geprüft.
- Reproduzierbar: `npm test`, `npx tsc --noEmit`, `npm run build`.
  Browser: `START_VITE=1 node tests/idea-app-browser.mjs`, benötigt lokal
  Playwright und Chromium; optionale Pfade `PLAYWRIGHT_MODULE`,
  `CHROMIUM_EXECUTABLE` oder `CHROMIUM_MODULE` (ESM-Default-Export).
- Backend:154gezielte Freizeit-Modultests erfolgreich; im Gesamtlauf fünf\n  bestehende Eva-Jobsuchefehler, siehe zentrale Übergabe.\n- Happy DOM ist ausschließlich Entwicklungsabhängigkeit für echte Controller-
  Tests. Chromium/Playwright nicht als Produktionsabhängigkeit hinzugefügt.

Bestehende ChatGPT-Aufgabe `04 · Freizeitsuche` am25.10.2026 pausiert, nicht
gelöscht. App-Worker bleiben deaktiviert. Chat00 integriert die App und die
begleitende zentrale Dokumentation. Kein Merge/Produktionsdeploy aus Fachchat04.
Danach echte Sammlung rein lesend prüfen (zuletzt36Ideen und94Orte/Touren),
geöffnete alte Tabs neu laden und iPhone/Safari visuell abnehmen. Keine
Beispieldaten in die echte Sammlung übernehmen.

## Korrektur: Freizeitidee bearbeiten · 25.10.2026
Der Formularaufbau unterscheidet jetzt vor dem Auslesen der Ortskategorie zwischen Idee und Ort. Zuvor wurde beim Bearbeiten einer bestehenden Idee deren fehlendes Ortsfeld kind ausgewertet; dies brach die Darstellung ab. Regressionen prüfen Bearbeiten, Speichern und Neuladen einer bestehenden Idee mit unveränderten Bewertungen und Orten, zusätzlich im Browser bei320/390/1024px. Produktive Daten bleiben unverändert.
