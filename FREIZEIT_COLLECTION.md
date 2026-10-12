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

## Zwei Bereiche nach Beständigkeit · 11.10.2026

Unsere Ideen: editierbare Standardaktivitäten, konkrete Orte/Touren, dauerhafte Recherchetouren und Gastronomie. Aktuell: Veranstaltungen mit Zeitraum sowie Kino und Streaming, über ein einziges Auswahlfeld statt mehrerer Kategorienleisten. Startseite ist Unsere Ideen; bestehende Favoriten bleiben in ihrem passenden Bereich, auch ältere Funde. Bekannte vergangene Veranstaltungstermine werden gekennzeichnet; ohne gespeicherten Termin wird keine Aktualität behauptet. Keine Recherche oder Änderung an Quellenprüfzeiten.

Nur gemerkt filtert jeden Bereich. Sterne an eigenen Standardaktivitäten und Vorratsorten werden optional im bestehenden privaten Payload gespeichert. Keine Migration, keine Rücksetzung. Die Auswahlhilfe nutzt weiterhin die vorhandenen Aktivitäts-/Vorratsregeln; Aktuelle Angebote ansehen führt von ihrem Ergebnis zum aktuellen Angebot. Für aktuelle Events werden keine unbekannten Dauer-, Zeit- oder Machbarkeitsangaben erfunden.

Validierung: 40 Tests, TypeScript und Produktionsbuild erfolgreich. Zwei-Bereiche-Navigation, Filter, echte Kategorien und Dialoge werden zusätzlich auf der veröffentlichten Oberfläche geprüft. Keine Recherche, Mail oder Rücksetzung.

Liveprüfung: beide Reiter, Veranstaltungs-/Kino-/Streamingauswahl, Nur gemerkt, Erhalt der vier bisherigen Favoriten, Detailfenster und Abbrechen erfolgreich. Keine produktive Sternänderung oder Speicherung zum Test. Leere Sternkategorien entfallen im Filter; gespeichertes Kinoprogramm wird ausdrücklich als gespeicherter Stand bezeichnet.

## Direkte Übernahme von Rechercheideen · 11.10.2026
Wander-, Fahrrad- und Restaurant-/Café-Recherchekarten bieten In Orte & Touren übernehmen. Direkte Speicherung im bestehenden gemeinsamen Payload mit Revisionsschutz, ohne Merken als Zwischenschritt oder Pflichtformular. Original-Link, Beschreibung, Quellen-ID und explizite Metadaten bleiben erhalten. Exakte km/hm/Minuten aus Metadaten werden übernommen; Zeitspannen/fehlende Werte bleiben unbekannt. Keine Prüfung erneuert, keine bezahlte Recherche. Bereits gespeicherte Quellen-ID oder gleichnamiger eigener Ort verhindert Duplikate und überschreibt keine eigenen Angaben. Fehlgeschlagene Speicherung wird nicht als Erfolg dargestellt.

Nutzerpräzisierung: Übernehmen ersetzt Merken auf Touren/Gastronomie-Karten. Merken bleibt für zeitabhängige Angebote. Vollständiger öffentlicher Vorschlag wird als privater Quellen-Snapshot erhalten; Beschreibung, Metadaten, Bedingungen und sicherer Original-Link sind im Detaildialog sichtbar, die Listenzeile bleibt kurz. Bei gleichnamigem vorhandenem Ort werden eigene Angaben erhalten, nur unbekannte Werte ergänzt und die Originalinformationen zusätzlich gespeichert. Keine Datenbankmigration.

Validierung: 42 Tests einschließlich Original-Snapshot, sicherer Links im Dialog, expliziter Tourdaten und Duplikaterkennung; TypeScript und Produktionsbuild erfolgreich. Keine produktiven Schreibtests oder Recherche.

## Einheitliche Kartenaktionen · 11.10.2026
Touren, Restaurants/Cafés und Events zeigen eine Hauptaktion plus Mehr in einer stabilen Zeile. Quelle, Details, Ausblenden und Bewertungen stehen gemeinsam im Mehr-Menü. Verschieben der vorhandenen Bedienelemente erhält deren Listener; keine Änderung an Speicher-, Bewertungs- oder Importfunktion. Schmale Ansichten dürfen den Hauptaktionstext innerhalb des Buttons umbrechen.

## Kompakte Vorschaukarten · 11.10.2026
Touren und Gastronomie zeigen Titel, Ort, Passung und Tour-Eckdaten sowie Hauptaktion/Mehr. Beschreibungen und ausführliche Prüfhinweise bleiben im Details-Popup erhalten. Anfahrt entfällt in der Übersicht. Automatisch gleich hohe Rasterzeilen sind entfernt, damit lange Karten keine Leerflächen in anderen Zeilen erzeugen. Gespeicherte Originaldaten und Übernahme bleiben unverändert.

## Kompakte Events · 11.10.2026
Unter Aktuell bleiben Titel, Datum/Uhrzeit, Ort und Passung sichtbar. Die vollständige Beschreibung steht unter Mehr → Details. Belegte Buchungsfristen bleiben in der Übersicht sichtbar. Automatische gleiche Rasterhöhen und Anfahrt sind aus der Eventübersicht entfernt; Inhalte, Merkliste und Bewertungen unverändert.

## Verständliche Vormerk-Aktion · 11.10.2026
Favoriten heißen im UI Vormerken/Vorgemerkt; der Filter heißt Nur vorgemerkte. Speicherung und Verhalten unverändert. Die dauerhafte Übernahme in Orte & Touren bleibt eigenständig.

## Persönliche Sternebewertung · 11.10.2026
Orte & Touren haben optional `rating: 1..5` im bestehenden privaten Sammlungspayload. Bewertung und Entfernen erfolgen unter Mehr im Detaildialog; Vormerk-Stern und bisherige Quellenbewertungen bleiben eigenständig erhalten. Speicherung nutzt die bestehende revisionsgeschützte Cloudaktualisierung mit Rücknahme bei Fehlern, keine Migration. Die Auswahlhilfe bevorzugt persönlich gut bewertete passende konkrete Ideen; unbewertet entspricht neutralen drei Sternen. Harte Zeit-/Ort-/Energie-/Aufwandsfilter, Ausblendungen und geschlossene Orte bleiben wirksam. Bei Schwimmbädern/Gastronomie verwendet die Auswahl die Dauer der Standardaktivität, ohne eine Ortsdauer zu erfinden. Tourdauer bleibt individuell erforderlich. Keine KI-Aufrufe oder automatisches Lernen ähnlicher Orte, keine Änderung an der Morgenmailbewertung.

## Vormerken nur für aktuelle Angebote · 11.10.2026
Orte & Touren und Standardaktivitäten zeigen keinen Vormerk-Stern mehr; der Vormerkfilter erscheint nur unter Aktuell. Gespeicherte frühere Favorite-Felder bleiben erhalten, filtern die dauerhafte Sammlung aber nicht. Die persönliche Bewertung mit 1–5 Sternen im Details-Popup bleibt unverändert.

## Gemeinsame Tourkategorien und Dauer · 11.10.2026
Wanderungen und Fahrradtouren haben jeweils eine gemeinsame Kategorie. Alte Kurz-/Lang-Kennungen werden beim Lesen derselben Gruppe zugeordnet und bleiben gültig, ohne Daten umzuschreiben. Jede Tour behält Dauer, Details und Sterne. Schwimmbäder, Cafés, Restaurants und Biergärten zeigen keine Ortsdauer und kein Dauerfeld im Bearbeiten; frühere Werte bleiben erhalten. Die Auswahl verwendet hier die gepflegte Dauer der Standardaktivität. Individuelle Tourdauer bleibt ein Auswahlkriterium.

## Geschmackstopliste bei Veranstaltungen
Unter Aktuell → Veranstaltungen stehen bis zu drei kommende Events mit dem höchsten bekannten öffentlichen Fitscore (90 Tage). Neue Katalogdaten ersetzen automatisch schwächere Treffer beim Laden der App; unbekannte Passung und ungeprüfte Importe werden nicht als Top-Tipp ausgegeben. Abgesagte, vergangene und ausgeblendete Events bleiben ausgeschlossen. Die Topliste ist unabhängig vom Zeitraumfilter der übrigen Events. Jede Karte steht nur einmal auf der Seite; Vormerken und Mehr bleiben erhalten. Keine neue Recherche, Bewertungsgewichte, Migration oder Änderung der Mailauswahl.

## Einheitliche Sterne und dauerhaftes Geschmacksprofil · 11.10.2026
Alle App-Bewertungen verwenden 1–5 Sterne (Events, Tourenvorschläge, Gastronomie, Kino/Streaming, Standardaktivitäten und Orte & Touren). Unter Mehr kann optional eine Begründung ergänzt werden. Die Sterne bewerten ausschließlich Geschmack. Alte binäre Rückmeldungen bleiben in recommendation_ratings unverändert erhalten und werden als frühere Rückmeldung gekennzeichnet, niemals als explizite Sterne ausgegeben. Bereits vorhandene echte Ortssterne werden verlustfrei in memory ins Archiv übernommen; unbekannte ursprüngliche Bewertungszeit bleibt leer.

Optionales tasteRatings im bestehenden personal_planning-JSON bewahrt bewertete Titel, Kategorie, Originalbeschreibung, Fakten, URL und Datum dauerhaft unabhängig von der Eventanzeige. Explizite Speicherung nutzt unverändert die revisionsgeschützte gemeinsame Aktualisierung mit Fehlerrollback/Konflikterkennung. Keine Datenbankmigration und keine Änderung von Kalendern, Favoriten, Ausblendungen oder Versandhistorien. Bewertungsbeispiele sind unter Mein Geschmack korrigierbar; Entfernung löscht nur die ausdrücklich gewählte Bewertung, nicht das Event oder den Vorrat.

Die App berechnet eine persönliche Rangfolge über dem unveränderten öffentlichen Grundscore. Exakte eigene Bewertungen und bereits bewertete identische Künstler-/Angebotstitel haben Vorrang; ausdrücklich ausgeschlossene/vergangene/abgesagte/unverifizierte Angebote werden nicht freigegeben. Musik mit nur Genrebeleg ist höchstens70 statt pauschal92. Merkmalslernen braucht mindestens zwei unabhängig bewertete Beispiele derselben Domäne mit mindestens zwei belegten gemeinsamen konkreten Eigenschaften; ein Titel zählt nur einmal, Einfluss begrenzt±12. Freitextgründe werden gespeichert/angezeigt, aber nicht ungeprüft als Inhaltsmerkmale interpretiert. Top3 aktualisiert sofort nach bestätigter Speicherung und beim Wiederladen. Standardaktivitätssterne beeinflussen Auswahlhilfe innerhalb der vorhandenen harten Zeit-/Energie-/Ort-/Aufwandfilter.

Das private Profil wird nicht an den öffentlichen Katalog projiziert. Diese Appänderung verändert die Morgenmail-Rangfolge noch nicht. Keine KI-Aufrufe, keine neue breite Recherche; Merkmalslernen bleibt mangels aussagekräftiger Beschreibungen begrenzt. Der bestehende Quellenleser ergänzt Beschreibungen erst bei seinen echten regulären Abrufen.

## Einheitliche Punktbewertung · 12.10.2026
Die bisherigen Sterne werden überall durch einen zugänglichen Schieberegler 0–100 in 5er-Schritten mit explizitem Speichern ersetzt. Eigene Bewertung und geschätzte Passung bleiben getrennt. 0 ist eine echte gespeicherte Bewertung; null bedeutet ausdrücklich entfernt/unbewertet. Alte 1–5-Sterne werden beim Lesen auf 0/25/50/75/100 umgerechnet; Originaldaten und unbekannte Bewertungszeiten bleiben erhalten. Präzisere neue Werte wie 80 bleiben ohne Rundung auf Sterne erhalten. tasteRatings verwendet optional score; Stock/Routinen optional ratingScore, alte stars/rating weiterhin lesbar. Explizite Änderungen schreiben das neue Format über die bestehende Revisionsprüfung. Auswahlhilfe und persönliche Top3 verwenden die volle Punktbewertung; Merkmalslernen behält seinen begrenzten Einfluss. Keine Migration, keine produktiven Testbewertungen oder Änderungen an anderen Nutzerdaten. Vormerken-Sterne bei Events bleiben als separate Merkliste erhalten. Die Morgenmail verwendet weiterhin ihre bestehende Priorisierung.

## Kompaktes Bewertungsformular · 12.10.2026
Der Dialog verwendet einen gemeinsamen Speichern-Button für Punktwert und optionale Begründung. Einmalige Punktanzeige, Begründung bei Bedarf aufklappbar, Quellen/Merkmale/Passung und Entfernen unter Mehr zum Vorschlag. Abbrechen verändert nichts. Nach bestätigtem Speichern schließt der Dialog mit kurzer Rückmeldung; bei Fehler bleibt der Entwurf samt Begründung bearbeitbar. Datenspeicherung und Bewertungsskala unverändert.
