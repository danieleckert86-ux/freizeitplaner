# Freizeitvorrat statt Wochenplaner

Die bestehende App zeigt Events, Touren & Ideen und Gemerkt. Die tägliche Morgenmail wählt im Code höchstens drei Tipps aus gespeicherten belegten Inhalten. Favoriten, Bewertungen, ausgeblendete Ideen, Routinen und Kalenderdaten bleiben in den bisherigen Supabase-Tabellen; keine Datenrücksetzung und keine neue Schreibberechtigung.

Events haben einen 90-Tage-Horizont, Fitscore vor Termin, Filter heute/Woche/Wochenende/30/90 Tage. Unbekannte Passung bleibt unbekannt. Wanderungen/Fahrradtouren sind dauerhafte Sammlung; grundsätzliche Passung und konkrete Wetter-/Sperr-/Routeneignung bleiben getrennt. Ungeprüfte Importtouren sind keine sicheren Ausflugsempfehlungen. Restaurants, Kino und Streaming bleiben gespeichert; aktuelle Verfügbarkeit beim Anbieter prüfen. Scheitert das Laden der Ausschlüsse, werden keine versteckten Ideen wiederhergestellt.

Der Katalog kommt bevorzugt aus `https://fahrrad-zur-arbei.vercel.app/api/leisure/catalog`, optional über `VITE_MORNING_CATALOG_URL`. Bei Nichterreichbarkeit bleiben der bisherige Supabase-Katalog und vorhandene JSON-Datei als Rückfall. Das Frontend recherchiert keine neuen Events. Die öffentliche Schnittstelle enthält keine Kalender, Profile, Routinen, Feedbackdaten, Häkchen oder Zugangsdaten.

## Direkte Originalrecherche · Vorschlag für 00 · 10.10.2026

Geprüfte Basis dieses Repositories: `main` `dbf021664c1bd8a4fcf6647a140c65f3a5c5f623`. `AGENTS.md` und `ARCHITECTURE.md` sind hier nicht vorhanden. Architektur und Recherchevertrag stehen im Morgenassistenten unter `docs/modules/04-freizeitplaner.md` (Basis `2fbc90e8b8acb2d76f78551f92d8dde08e66e2c4`). Der vorherige Sparumbau ist bereits integriert; dieser Vorschlag wird separat als Draft-PR übergeben.

Der zentrale Worker ersetzt die alte Freizeit-KI-Pipeline durch drei direkt geprüfte Originalprogramme: Musikkantine, Kulturhaus abraxas und Kresslesmühle. Öffentliche zulässige Weiterleitungen werden unterstützt. Detailseiten müssen Datum, Beginn, Ort und Original-Link belegen. Einlass, unbekannte Anfahrt/Ende/Buchungsfrist und importierte Angaben werden nicht als gesichert ausgegeben. Absage und Ausverkauf verhindern Empfehlungen. KI-Ersatz für Events und Öffnungen wird vollständig entfernt; Jobs und Nachrichten bleiben unverändert. Events Di/Fr, größere Programme in gespeicherten fortsetzbaren Paketen. Tourensammlung erhalten; keine automatische breite KI-Tourenrecherche.

Die aktive Quellenabdeckung umfasst genau diese drei Quellen. Historische zusätzliche Quellen und Einzelchecks bleiben gespeichert. Unvollständige Pakete sind keine erfolgreichen Null-Läufe. Fehlende, fehlgeschlagene, veraltete und erfolgreiche Prüfungen bleiben getrennt; Speicherzeit und erneuter DB-Abruf sind keine Quellenprüfung. Stabile Publisher-IDs erhalten die Nutzer-ID nach belegten Änderungen; Import bleibt Import ohne Originalbeleg.

`src/collection.ts` erläutert direkte HTTP-/Robots-/Parserfehler und bezeichnet `catalog_source_in_progress` als „Prüfung unvollständig“. Die bestehenden UI-Bereiche bleiben erhalten. Optionale öffentliche Felder `lastSuccessfulFetchAt` und `details` sind kompatibel mit älteren Antworten; ursprüngliches `checkedAt` wird nicht ersetzt. Kein Budget-/Modell-/Tokeninhalt im öffentlichen Katalog. Das bestehende **Freizeitbudget von 5 USD pro Berlin-Monat einschließlich Öffnungen** bleibt unabhängig von den Jobsuchen; kein zusätzlicher Budgetmechanismus in der App.

Prüfung: `npm test`, `npx tsc --noEmit`, `npm run build`. Der zusätzliche Test belegt ehrliche Teilabdeckung, akzeptierte Mengen, HTTP502 und erhaltene Prüfzeitpunkte. Keine produktiven Schreibaktionen, keine Testmail, keine bezahlte Recherche und kein Browser-UI-Test in diesem Umbau.

00 integriert beide PRs und prüft Preview, öffentlichen Katalog und gespeicherte Mailvorschau. Die bereits bestehende Katalog-URL und das zentrale Aktivierungsflag werden hier nicht verändert. Keine parallele alte Nacht-/KI-Recherche aktivieren. Direkte Routen-/Sperrprüfungen für konkrete Touren und weitere Event-/Kinoprovider bleiben offene Erweiterungen.

Explizit als abgesagt/ausverkauft belegte vorhandene Events behalten ihre ID und alten Prüfzeitpunkt; `closed:true` verhindert ihre Anzeige als kommender Tipp. Nutzerentscheidungen werden nicht gelöscht. Ein später belegter gültiger Termin kann denselben Eintrag wieder öffnen.

## Bekanntes · 11.10.2026 · Integrationsvorschlag

Eigener Hauptreiter „Bekanntes“ (Direkteinstieg #bekanntes) statt der bisherigen Routineansicht unter „Touren & Ideen“. Enthält alle 74 im Fachchat06 ausdrücklich übernommenen Aktivitätsideen: Bewegung, draußen, Essen, Kultur, Kreatives, Entspannung und kleine Ausflüge. Bestehende Routinen bleiben unverändert; gleiche normalisierte Titel bzw. IDs werden nicht doppelt eingefügt. Dauerangaben sind editierbare Richtwerte, keine geprüften Öffnungs-/Terminangaben. Keine Recherche und keine behauptete Verfügbarkeit.

Die vorhandenen Aktionen zum Ergänzen, Bearbeiten und Löschen bleiben erhalten. Speicherung nutzt unverändert personal_planning/shared mit bestehender Revisionsprüfung und RLS, nicht localStorage. readCloud ergänzt die Liste nur im Arbeitsspeicher; bloßes Öffnen schreibt nichts. Die erste ausdrücklich gespeicherte Änderung bewahrt die ergänzte Liste samt knownActivitiesVersion:1 im vorhandenen JSON-Payload. Dieser optionale Marker verhindert, dass später gelöschte Ideen nach einem Reload oder auf einem anderen Gerät wieder hinzugefügt werden. Alle anderen Planungsfelder bleiben erhalten. Bei Konflikten wird weiterhin der aktuelle gemeinsame Stand geladen, ohne fremde Änderungen zu überschreiben.

Kein neuer Datenbankendpunkt, keine Migration oder zusätzliche Berechtigung, keine Änderung an ModuleResult v1, Quellenprüfzeiten, Fehlerstatus, Jobs-Profilhistorien oder Anti-Autopilot-Zählern. Eine gespeicherte Aktivitätsidee ist keine bestätigte Initiative. Öffentliche Katalogprojektion bleibt unverändert; die neuen Defaults werden erst nach einer ausdrücklichen Speicherung Teil der gemeinsam gespeicherten Routinen und damit des vorhandenen Routineadapters.

Validierung: 11/11 Tests, npx tsc --noEmit und npm run build bestanden. Tests prüfen vollständige Seed-Liste, Feldvalidität, Erhalt eigener Änderungen, Duplikate und dauerhaftes Löschen nach Reload. Produktiver lesender SQL-Check bestätigt 9 bestehende Routinen und noch keinen Marker; keine produktiven Planungsdaten verändert. Kein Geräte-/Browser-End-to-End-Test. Veröffentlichung erfolgt separat als Draft-PR; Integration und Deployment durch00.

Bekanntes wird kompakt nach Draußen, Bewegung, Genuss und Kultur gruppiert. Kategorien sind zunächst zugeklappt; pro Idee stehen Titel, Richtdauer und Mehr-Menü in einer Zeile. Bearbeiten und Löschen verwenden unverändert die gemeinsame Speicherung.



## Freizeitvorrat für Standardaktivitäten (11.10.2026, PR-Stand)

Der erste Schritt des neuen Fokus ergänzt **Gemerkt** um einen konkreten,
manuell pflegbaren Vorrat. Ziel sind drei bis fünf brauchbare Orte/Touren je
Art, keine automatisch gefüllte oder als geprüft ausgegebene Sammlung.
Arten: Fahrradtour kurz/lang, Wanderung kurz/lang, Spaziergang, Schwimmen,
Café, Restaurant, Biergarten. Bestehende Merkliste und Events bleiben erhalten.

`src/activity-stock.ts` enthält Validierung, Zuordnung und Auswahl.
`personal_planning.payload.activityStock` ist ein optionales privates JSON-Feld
(maximal 500 Einträge). Bestehende Zeilen, Routine-IDs, Kalender, Bewertungen,
Ausschlüsse und Historien werden weder migriert noch zurückgesetzt. Schreiben
nutzt den bestehenden Revisionsvergleich für `id=shared`; bei Konflikt wird der
neue Cloudstand geladen. Kein neues Schema, keine neue RLS-Regel, kein neuer
öffentlicher Endpunkt. Ältere Clients erhalten unbekannte Payload-Felder über
den bestehenden Zustand; bei parallelen Bearbeitungen greift der Revisionsschutz.

Jede Idee speichert Name, Art, Link, Dauer, gesamte Anfahrt hin/zurück, optional
Strecke/Höhenmeter sowie Ort, Energie, Aufwand und Notizen. Unbekannte Zahlen
bleiben `null`; Anfahrt wird nicht als null Minuten erfunden. Angaben sind
manuelle Planungsschätzungen, keine Quellenprüfung. Kein `verifiedAt` und kein
künstlich erneuerter Prüfzeitpunkt. Übernahme aus der bestehenden Merkliste
öffnet ausdrücklich erst ein Formular. Kurze/lange Tour und Eigenschaften
müssen dort geprüft werden. Konzerte werden nicht automatisch zu Vorratsideen.

Der bestehende Fünf-Fragen-Assistent ergänzt je passender Standardaktivität
höchstens eine konkrete Idee: gleiche Art, Dauer **einschließlich Anfahrt**,
Ort, Energie und Aufwand müssen passen. Ohne bekannte Dauer/Anfahrt keine
automatische konkrete Auswahl. Verknüpfte Ideen werden bei fehlenden
Ausschlüssen/Bewertungen, Ausblendung oder negativer Bewertung unterdrückt.
Eigene manuell gespeicherte Ideen bleiben verfügbar. Vorschläge sind als
ungeprüfte Planungsoption gekennzeichnet; Öffnung, Wetter, Route und Sperren
sind vor Durchführung zu prüfen. Der Assistent führt keine Kalenderabfrage aus;
das explizite Einplanen verwendet den bestehenden Planungsdialog.

Vier vom Nutzer gelieferte Google-Maps-Listen sind in den betreffenden Gruppen
verlinkt. Kostenloser Browserabruf am 11.10.2026: Restaurants 58 Orte,
Schwimmen 18, Cafés 29, Biergarten 7. Lesbar waren beispielsweise Drei
Königinnen, Altes Stadtbad, Café Flora und Kulperhütte. Das ist kein vollständiger
Import und keine Einzelortprüfung. Die Listen enthalten auch geschlossene,
falsch kategorisierte oder außerhalb der Region liegende Orte; daher kein
pauschaler Import in die Auswahl. Namen, Original-Ortlink und Planungsangaben
werden beim konkreten Ergänzen erfasst. Kein automatischer Maps-Scraper und
keine laufenden Recherchekosten durch diese Verlinkung.

Validierung: 33 Tests, TypeScript und Vite-Build. Ein isoliertes JSONB-SELECT
(nur Literal-Testdaten, keine Tabellen) bestätigt die additive Speicherung von
`activityStock` und vorhandenen `entries`; kein produktiver Schreibtest.
Offen für Chat 00: Preview/Deployment, manuelles Speichern/Neuladen mit dem
bestehenden Cloudzugang und Konflikttest auf zwei Geräten. Browser-UI und RLS
wurden in diesem Schritt nicht end-to-end live geprüft. Die neue Priorisierung
spezieller Events und die Morgenmail sind ausdrücklich nicht Teil dieses ersten
Vorrats-Schritts; ModuleResult v1, Quellenprüfungen und Recherchebudget bleiben
unverändert. Keine KI-Recherche, keine Mail, keine Produktionsdatenänderung.



## Maps-Orte als Basis · Nutzerkorrektur 11.10.2026

Die vier Listen wurden vollständig im Browser gelesen: 58 Restaurants, 18 Schwimmorte, 29 Cafés, 7 Biergärten. 112 Nennungen ergeben nach drei Mehrfachnennungen und dem ausgeschlossenen Parkplatz 108 Orte. Die Ortsnamen werden als editierbare Basis ergänzt, nicht lediglich verlinkt. Café/Biergarten-Kategorien werden anhand lesbarer Maps-Kategorie bzw. ausdrücklich gelieferter Liste eingeordnet. Die Listenlinks entfallen aus der Oberfläche; importierte Einträge haben keinen erfundenen Original-Ortlink. Keine laufende Maps-Abfrage oder KI-Kosten.

Zehn als geschlossen angezeigte Orte bleiben sichtbar und editierbar, aber vorerst nicht auswählbar. Die Sperre ist im Formular korrigierbar. Keine automatische Öffnungs-/Anfahrtsprüfung behaupten. Dauer, Anfahrt, Strecke und Höhenmeter bleiben unbekannt; Ort, Energie und Aufwand sind editierbare Planungseinordnungen. Ohne bekannte Dauer und Anfahrt keine automatische konkrete Fragebogenauswahl.

`withMapsStock` ergänzt die Basis beim Cloud-Lesen im Arbeitsspeicher und erhält alle vorhandenen privaten Felder. Erste ausdrückliche Speicherung übernimmt sie mit `stockMapsVersion:1` und bestehender Revision in die gemeinsame Planung. Danach bleiben bearbeitete oder gelöschte Basisorte auf allen Geräten erhalten bzw. gelöscht. Vorhandene gleichnamige eigene Einträge haben Vorrang. Kein Zurücksetzen, keine Migration, keine Änderung an Morgenmail oder Eventauswahl.

Validierung: 36 Tests einschließlich eindeutiger IDs, sichtbarer Basisorte, geschlossener Orte, eigener Änderungen, dauerhafter Löschung und fehlender Listenlinks; TypeScript und Build. Zusätzliche tatsächliche Speicher-/Lesefunktionen mit isoliertem Provider geprüft. Keine Produktionsschreibtests oder Mail.


## Kompakter Finder und Vorrat · Nutzerentscheidung 11.10.2026

Die App dient Events finden, Bekanntes speichern und Auswählen. Einplanen entfällt aus Merkliste, Bekanntes, Auswahlhilfe und Freizeitvorrat. Wochenplan-/Kalenderoberflächen und zusätzliche Planungsaktionen werden nicht mehr gerendert; bestehende gespeicherte Kalender-/Planungsdaten und ihre Verträge bleiben erhalten. Keine automatische Kalenderänderung.

Freizeitvorrat nutzt kompakte zugeklappte Kategorien und Zeilen wie Bekanntes: Name, Dauer, Ort, gegebenenfalls geschlossen. Mehr öffnet ein natives modales Detailfenster; Bearbeiten/Ergänzen erfolgt ebenfalls im Fenster. Öffnen, Abbrechen und Escape schreiben nichts. Kategorien bleiben bei Dialogwechseln geöffnet. Anfahrt erscheint weder in Übersicht noch Formular und ist keine Voraussetzung mehr für Auswahl; Aktivitätsdauer ist die Zeitgrenze. Bereits gespeicherte Anfahrtsfelder bleiben erhalten, ohne als Auswahl- oder Verfügbarkeitsnachweis genutzt zu werden. Unbekannte Aktivitätsdauer bleibt weiterhin unbekannt. Keine Mail-, Recherche-, Budget- oder Kalenderbrückenänderung.

Validierung: 38 Tests, TypeScript und Produktionsbuild erfolgreich. Historische Planungsfelder bleiben lesbar und bei ausdrücklicher Speicherung erhalten; keine neuen Planungsaktionen in der Oberfläche.
