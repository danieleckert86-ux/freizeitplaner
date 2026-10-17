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

## Einheitliche Bewertung und geordneter Ortseditor · 13.10.2026
Alle Detailansichten zeigen nur den gespeicherten Punktwert und Bewerten/Bewertung ändern. Der einzige Bewertungsdialog bearbeitet Punkte und optionale Begründung gemeinsam. Ein zuvor geöffnetes Detailfenster wird währenddessen geschlossen und anschließend wiederhergestellt; keine zwei gleichzeitig offenen Dialoge. Der Orts-/Toureneditor zeigt Name, Kategorie und Drinnen/Draußen zuerst, Tourdaten nur bei Touren, Link/Notizen sowie Auswahlhilfe/Verfügbarkeit in aufklappbaren Abschnitten. Ein gemeinsamer Speichern-Button und Abbrechen. Geschlossene Felder bleiben im Formular und werden verlustfrei gespeichert. Bewertungen, Original-Snapshots und Cloud-Revisionsschutz bleiben erhalten.

## Direkter Mehr-Dialog · 13.10.2026
Mehr öffnet auf öffentlichen Vorschlägen, Standardaktivitäten sowie Orten/Touren unmittelbar den gemeinsamen Dialog mit 0–100-Bewertung, optionaler Begründung, Beschreibung, Metadaten, Originalquelle und vorhandenen Quellen-Snapshots. Die Informationen sind direkt aufgeklappt; kein vorgelagertes Aktionsmenü und kein zweites Bewertungsfenster. Bearbeiten, Entfernen, Vormerken/Übernehmen und Ausblenden verwenden weiter die bestehenden Aktionen. Aktuelle Vorschlagsdetails haben beim Öffnen Vorrang vor alten Bewertungs-Snapshots; archivierte Beispiele bleiben verfügbar. Bewertungs- und Datenspeicherung unverändert, keine Recherche oder Mail.

## Kartenaktionen korrigiert · 13.10.2026
Die frühere collection-mode-CSS-Regel display:flex!important überschrieb hidden an der internen Detailablage. Eine spezifische Hidden-Regel unterdrückt diese Ablage wieder vollständig. Vormerken/Übernehmen, Mehr und Ausblenden stehen in einer gemeinsamen dreispaltigen Aktionszeile. Ausblenden bleibt mit dem ursprünglichen Handler auf der Karte; Beschreibung, Bewertung und Quellen sind über den bestehenden Mehr-Dialog erreichbar. Keine Änderung an Bewertungs-/Ausblendungsdaten.


## Getrennte Geschmacksarchive · 13.10.2026
Die Hauptbereiche heißen Standardaktivitäten und Neues; interne Navigationskennungen und bisherige Direktlinks bleiben kompatibel. Mein Geschmack folgt dem gewählten Bereich bzw. der Auswahl Veranstaltungen, Kino oder Streaming. Es zeigt ausschließlich zugehörige gespeicherte Bewertungen inklusive Kommentar. Mehr öffnet weiterhin den gemeinsamen 0–100-Dialog in 5er-Schritten mit optionaler Begründung; Kino nutzt denselben revisionsgeschützten privaten tasteRatings-Speicher wie die anderen Vorschläge. 0 bleibt eine echte Bewertung, frühere Einträge und fremde Planungsfelder bleiben erhalten. Kein produktiver Testeintrag.

Kino-, Streaming- und Veranstaltungsbeispiele werden in der persönlichen Auswertung getrennt. Bestätigtes mediaType wird aus dem Katalog in den privaten Bewertungs-Snapshot übernommen; Streaming-Filme und -Serien werden getrennt ausgewertet, unbekanntes Format bleibt unbekannt. Ältere Daten ohne mediaType sind weiterhin gültig; eine eindeutige Film-/Serienkategorie kann das Format für den Vergleich bestimmen. Kommentare werden erhalten und im Archiv angezeigt. Die bestehende ChatGPT-Recherche liest tasteRatings samt Gründen nach dem aktuellen src/taste-profile.ts; keine Kommentarwörter als erfundene Inhaltsmerkmale, keine neuen Gewichte. Öffentlicher Katalog und Morgenmail-Grundpassung bleiben unverändert.

Integration/Veröffentlichung durch 00 gemäß bestehendem Repository-Vertrag. Validierung: Tests für kategorienspezifische Archive, getrennte Übertragung ähnlicher Beispiele, Film-/Serienformat, 0-Punkte und Kommentar nach Speichern/Reload, TypeScript und Produktionsbuild.


## Vorrat und Entdeckung getrennt · 13.10.2026
Standardaktivitäten enthält genau zwei Unterreiter: Standardaktivitäten sowie Orte & Touren. Neues enthält Veranstaltungen, Kino, Streaming, Essen & entdecken und Raus ins Grüne. Die bisherigen dauerhaften Gastronomie-/Touren-Recherchekarten erscheinen ausschließlich in Neues und können weiterhin ohne Datenverlust in Orte & Touren übernommen werden. Die neuen Reiter sind echte bedienbare Kategorien; der alte interne Auswahlwert bleibt kompatibel.

Essen & entdecken gliedert gespeicherte Recherche nach Restaurants, Cafés und Biergärten anhand expliziter Kategorie/Typangaben. Raus ins Grüne zeigt Fahrrad-, Wander- und Spazierwege. Spaziergänge werden aus eindeutig so bezeichneten bestehenden Touren erkannt; optional gelieferte walks werden angezeigt, es wird kein Katalogschema stillschweigend geändert. Ungeklärte Typen, Tourdaten und Bedingungen werden nicht erfunden. Biergärten werden beim Übernehmen korrekt der Vorratsart beer-garden zugeordnet. Vormerkfilter gilt weiterhin nur für Events/Kino/Streaming; Gastronomie und Touren haben Übernehmen. Mein Geschmack erhält passende Archive für Gastronomie und Outdoor, vorhandene Bewertungen bleiben gespeichert.

Der bestehende ChatGPT-Rechercheauftrag wird um Biergärten sowie Spaziergänge ergänzt; keine neue Aufgabe und kein sofortiger Suchlauf. Der bestehende monatliche breite Tourenrhythmus und alle Sicherheits-/Beleg-/Konfliktregeln bleiben erhalten. Spaziergänge nur mit tatsächlich bestätigtem kompatiblem Speicherpfad aufnehmen; Schema-Lücken als ungeklärt melden, keine Wander- oder Veranstaltungsdaten für einen kurzen Spaziergang erfinden. Integration der Appänderung weiterhin über PR9/00.

Validierung des erweiterten Standes: 65/65 Tests, TypeScript und Produktionsbuild erfolgreich. Isolierte DOM-Prüfung mit simulierten Katalog-/Planungsantworten bestätigt beide Standardreiter, alle fünf Neues-Reiter, die Gastronomiegruppen, Spaziergänge und die richtige Biergarten-Übernahme. Keine Cloud-Schreibaktionen im Test. Bestehender Rechercheauftrag aktualisiert und prompt-/zeitplangleich zurückgelesen.


## Persönliche Passung auf allen Recherchekacheln · 13.10.2026
Kino, Streaming sowie Restaurants/Cafés/Biergärten erhalten dieselbe sichtbare collection-fit-Anzeige wie Veranstaltungen und Touren: Punkte / 100 · persönliche Passung. Bestehende adjustedTaste-Auswertung aktualisiert alle Anzeigen beim Laden sowie nach bestätigter Bewertungsänderung. 0 bleibt sichtbar, ungeklärte/importierte Grundpassung bleibt ausdrücklich unbekannt. Keine zweite Formel oder neue Gewichte; eigene Bewertung und gespeicherte öffentliche Grundpassung bleiben getrennt. Keine Änderung an Daten, Recherche, Vormerken oder Übernehmen. Integration/Veröffentlichung durch00.

Validierung: 65/65 Tests, TypeScript und Produktionsbuild bestanden. Isolierte DOM-Prüfung bestätigt die Passung in Kino, Streaming und allen drei Gastronomiegruppen einschließlich einer gespeicherten eigenen 0-Bewertung im Kino. Keine Cloud-Schreibaktionen.


## Raus ins Grüne wie die übrigen Entdeckungsreiter · 13.10.2026
Die Outdoor-Recherche verwendet denselben unabhängigen Abschnitt wie Essen & entdecken, ohne zusätzlichen grünen Außenkasten. Drei Abschnitte stehen untereinander: Fahrradwege, Wanderwege, Spazierwege. Bestehende Gruppen-IDs und Kartenaktionen bleiben erhalten. Die Überschriften bleiben auch bei einer leeren Gruppe sichtbar; ein kurzer Leerhinweis ersetzt keine Recherche und erfindet keine Treffer. Keine Daten-, Bewertungs- oder Rechercheänderung.


## Streaminggruppen und einheitliche Kachelhöhe · 13.10.2026
Streaming zeigt Filme und Serien als getrennte Abschnitte. Bestätigtes mediaType hat Vorrang; ältere eindeutige Film-/Serienkategorien dienen als kompatibler Fallback. Unbekannte oder widersprüchliche Typen bleiben unter Format noch ungeklärt, ohne Inhalte zu erfinden. Laufzeitmetadaten entfallen ausschließlich auf Streaming-Vorschaukacheln; die Originaldaten und Details bleiben erhalten.

Alle Recherchekacheln für Veranstaltungen, Kino, Streaming, Gastronomie und Outdoor verwenden dieselbe Höhe von 280px und eine unten ausgerichtete Aktionszeile. Lange Titel/Ortsangaben sind in der Vorschau auf zwei Zeilen begrenzt; volle Angaben bleiben unter Mehr erhalten. Keine Änderung an Recherche, Bewertungen, Vormerken, Übernehmen oder gespeicherten Daten. Integration durch00.

Validierung: 67/67 Tests, TypeScript und Produktionsbuild bestanden. Isolierte DOM-Prüfung bestätigt Film-/Seriengruppen, separate ungeklärte Formate, entfernte Laufzeit bei erhaltenem Dienst-/Datumsmeta und 280px als berechnete Kachelhöhe aller geprüften Recherchearten. Persönliche 0-Bewertung und Aktionen bleiben erhalten; keine Cloud-Schreibaktionen.



## IMDb bei Kino und Streaming · 13.10.2026
Verfügbare numerische IMDb-Wertungen (0–10) erscheinen als IMDb 7,3/10 auf
Kino- und Streamingkacheln. Ein bestätigter HTTPS-IMDb-Titellink wird verlinkt;
ohne passenden IMDb-Link erscheint die Zahl als Text, nicht als irreführender
Link zur Kino-/Dienstseite. Die IMDb-Zahl bleibt getrennt von der persönlichen
0–100-Bewertung und Passung. Keine IMDb-Schätzung aus Geschmack/Text.

Bekannte Wertungen unter7,0 sind aus Kino-/Streaming-Vorschlägen ausgeschlossen,
auch im ungeklärten Streamingformat und bei der erneuten Anzeige vorgemerkter
Titel mit verfügbarer niedriger Wertung. Exakt7,0 bleibt erlaubt. Fehlende,
null oder ungültige Werte werden nicht zu0 und sind kein Ausschlussgrund.
Gespeicherte Titel, Vormerkungen, Bewertungen und Geschmacksarchive werden
nicht gelöscht. Keine neue Recherche, neue Quellenzeit oder Datenbankmigration.

Die gemeinsame Katalogprojektion erhält optional imdbRating/imdbUrl; bisher
wurden diese bereits in der App vorhandenen Felder dort weggelassen. Bestehende
Bestände ohne IMDb-Feld bleiben lesbar. Die bestehende Freizeitsuche erhält
 dieselbe harte Grenze für bekannte Werte und speichert belegte Werte bei ihren
regulären Läufen; keine neue Aufgabe, kein Sofortlauf und keine bezahlte API.
Codeintegration/Veröffentlichung durch00 erforderlich. Ohne gespeicherte
IMDb-Wertung erscheint noch keine Zahl; es wurden keine neuen Werte recherchiert.

Validierung:69/69 App-Tests, TypeScript und Vite-Build erfolgreich. Grenzwerte
0/6,99/7,0, unbekannte Werte, deutsche Anzeige und sichere IMDb-Titellinks
geprüft. Zentrale Projektion/Import-/Fitregeln separat mit isolierten Tests.


## Deutsche Trailer bei Kino und Streaming · 13.10.2026
Kino, Streaming-Filme und Streaming-Serien zeigen Deutscher Trailer, wenn ein
sicherer HTTPS-Videolink und ausdrücklich trailerLanguage='de' gespeichert sind.
Ein bloßer Link oder deutscher Videotitel beweist die Sprachfassung nicht.
Unbekannte/englische Trailer werden nicht als deutsch angezeigt; fehlender
Trailer ist kein Ausschlussgrund. IMDb-Grenze7,0, persönliche Punkte, gleiche
Kachelhöhen und die vorhandenen Kartenaktionen bleiben unverändert.

Die Katalogprojektion erhält optionale trailerUrl/trailerLanguage für bestätigte
deutsche Medien-Trailer. Die bestehende geplante Freizeitsuche übernimmt bei
regulären Läufen tatsächlich belegte deutsche Trailer, bevorzugt von offiziellen
Film-/Verleih-/Studio-/Dienstquellen. Kein neuer Suchlauf, keine bezahlte API
oder produktive Datenänderung. Vor Codeintegration keine unbekannten Felder
schreiben; die Aufgabe benennt fehlende Schemaunterstützung als Integrationslücke.

71/71 App-Tests, TypeScript und Produktionsbuild. Tests prüfen bestätigte
Sprache, fehlende/englische Sprache, ungültige Links und sichere HTML-Ausgabe.
Integration/Veröffentlichung durch00 offen; bisher gespeicherte Trailer ohne
Sprachbeleg werden nicht rückwirkend als deutsch markiert.

## YouTube-Suche als Trailerersatz · 13.10.2026
Ohne belegten deutschen Direkttrailer führt Trailer auf YouTube suchen zu einer Suchseite für den konkreten Film-/Serientitel plus trailer deutsch. Auch englische, sprachlich ungeklärte oder ungültige direkte Trailer verwenden diesen Ersatz. Die Suchseite ist kein bestätigter deutscher Trailer und löst keinen automatischen Abruf aus. Belegte deutsche Direktlinks behalten Vorrang. IMDb-Anzeige/-Grenze und Daten unverändert.


## Medienkacheln · 13.10.2026
Streaming zeigt den gespeicherten Anbieter; bei Platzhaltern werden vorhandene Anbieter-Metadaten oder eindeutige Anbieter-Domains verwendet. Ungeklärte Anbieter bleiben ausdrücklich ungeklärt. Laufzeit-Metadaten entfallen für Kino und Streaming einschließlich der Detail-Metadaten, ohne gespeicherte Originaldaten zu ändern. IMDb und Trailer bleiben erhalten.


## Einheitliche Reiter · 13.10.2026
Die Reiter unter Neues verwenden Raus ins Grüne als Layoutreferenz: einheitliche Bereichsüberschrift, Gruppenüberschriften wie Fahrradwege, Abstände und zweispaltige Listen (mobil einspaltig). Kino und Streaming erhalten passende Bereichstitel. Top-3-Auswahl und alle gespeicherten Entscheidungen bleiben erhalten.


## Eventfilter und Sortierung · 16.10.2026
Zeitraum gilt gemeinsam für Top 3 und weitere Events, einschließlich Nur vorgemerkt. Top 3 bleiben die stärksten belegten persönlichen Passungen im ausgewählten Zeitraum. Weitere Events lassen sich nach Datum (zuerst nächster Termin, danach Uhrzeit) oder persönlicher Passung sortieren; unbekannte Passung steht hinter bekannten Scores. Ein gemeinsamer Refresh erhält alle Karten, damit Wechsel von Heute zu 90 Tage und erneute Bewertung nicht Events verlieren. Die Hidden-Regel gewinnt gegen die feste Flex-Kartenhöhe. Keine neuen Recherchen, Änderungen an Nutzerentscheidungen oder neue Mail.

## Passung und Recherchetransparenz · 16.10.2026

Flache Strecke wird nur aus ganzen Beschreibungswörtern wie „flache“/„ebenen“ erkannt, nicht aus „Leben“ oder „neben“. Bestehende 0–100-Bewertungen und Gründe werden ausschließlich gelesen. Persönliche Passung ist eine Rangfolge, keine Wahrscheinlichkeit; die Kachel erläutert dies im Detailhinweis.

Quellenanzeige unterscheidet Teilprüfung (expliziter partial-Grund/offene Detailseiten) von tatsächlichem Abruffehler, vollständiger, fehlender und veralteter Prüfung. Letzter erfolgreicher Abruf und aktueller Versuch bleiben getrennt; UTC wird nur für die Anzeige nach Europe/Berlin umgerechnet. Vorhandene erhaltene/bearbeitete/übernommene Zahlen und offene Detailseiten werden gezeigt. Ergänzte öffentliche Quellen werden vom gemeinsamen Katalog gelesen. Kein eigener Worker, keine neue Statuskennung im gespeicherten Katalog und keine privaten Schreibaktionen.

Nach der Liveprüfung: Tourenmerkmale sind auf Outdoor-Beispiele begrenzt. Ein Konzertvergleich mit einem ruhigen Akustikabend ist keine ruhige Tour. Explizit „keine Rundtour“/„nicht eben“ erzeugen keine positiven Streckenmerkmale. Diese Korrektur betrifft nur die Merkmalsableitung, nicht gespeicherte Punkte oder Kommentare.

## Google Maps für Gastronomie · 16.10.2026
Restaurant-/Bistro-, Café- und Biergarten-Links öffnen Google Maps statt der Homepage: in Neues, Bewertungsdetails, Vormerkungen und Ortsdetails im Vorrat. Bereits gespeicherte sichere Maps-Ortslinks bleiben erhalten; andernfalls wird eine kostenlose Maps-Ortsuche aus Name und vorhandener Adresse/Ort gebildet, bei unbekannter Lage mit Augsburg als Suchkontext. Keine erfundenen Place-IDs oder Geocoding-Aufrufe. Originalbelege, gespeicherte URLs, private Einträge und Bewertungen werden nicht umgeschrieben. Andere Kategorien behalten ihre bisherigen Links.

## Geschmacksprofile statt neuer Einzelbewertungen (16.10.2026)
Private `personal_planning.payload.tasteProfiles` speichert Wünsche, Ausnahmen und
Beispiele je Kategorie. `film` gilt für Kino und Streamingfilme, `series` für Serien.
Aktuelle Nutzervorgaben sind initial hinterlegt; Bearbeiten/Speichern nutzt den vorhandenen
Revisionsschutz. Bewertungen bleiben im Archiv; keine neuen Slider auf Kacheln/Details.
`src/taste-settings.ts` definiert den additiven Vertrag. Die geplante Recherche liest die
aktuellen Profile und schreibt nur private `tasteAssessments` mit versioniertem Inhaltsbeleg.
Kein Browser-KI-Aufruf, keine erfundene automatische Freitextgewichtung. Ein Profilwechsel
macht alte Abgleiche ausstehend. App zeigt starke Passung, mit Vorbehalt oder offen; negative
Abgleiche bleiben gespeichert und werden als Empfehlung verborgen. Quellenbelege und
Katalog-Grundpunkte werden dabei nicht verändert. Neue Medien benötigen bestätigte IMDb >=7,8.

## Discovery-Freigabe · 17.10.2026

In „Neues“ erscheinen über sämtliche Kategorien nur aktuelle, belegte starke
Profilabgleiche. Vorbehalte/fehlende Abgleiche bleiben gespeichert, aber verborgen;
Standardaktivitäten und eigener Vorrat werden dadurch nicht entfernt. Dasselbe gilt
für wieder eingeblendete Discovery-Vormerkungen. Profilwechsel wird erneut gefiltert.
Streaming ist auf 0–60 Berliner Kalendertage seit belegtem Dienststart begrenzt;
IMDb >=7,8 samt Titel-Link, bestätigtes Format und einer der fünf Dienste sind Pflicht.
Kino benötigt einen zukünftigen Augsburger Beginn. Strukturierte Tourenfakten werden
unabhängig von der Passungsentscheidung geprüft. Die reine Freigabefunktion ist mit
dem Backend bytegleich. Browserabnahme: `tests/reliability-browser.mjs` mit ausschließlich
abgefangenen Daten; keine Produktivschreibzugriffe. Zwei alte, unabhängige Freiraum-
Backendtests bleiben als bereits bestehende Fehler dokumentiert.

## P1-Outdoorbelege und Quellenarbeit · 17.10.2026

Die byte-identische recommendation-eligibility.ts prüft optionales routeEvidence:
belegte Startgemeinde, Wegcharakter, Sicherheit, richtige Dauer-Sportart,
Gesamtaufstieg statt bloßer Höhendifferenz sowie feste Cityrad-Oberfläche.
Autospaziergänge benötigen nachgewiesene höchstens30Min ab öffentlichem
Augsburg-Referenzpunkt und einen konkret belegten besonderen Reiz. Unvollständige
alte Touren bleiben gespeichert, erscheinen aber nicht als freigegebene Ideen.
Persönlicher Vorrat bleibt außerhalb dieses Filters. Kein neuer Nutzer-Schreibweg.
Fortsetzbare Pakete und echte Quellen-Fallbacks liegen im Backend/ChatGPT-Auftrag;
Inventarzahlen sind keine persönlichen Freigaben.

## Essen & entdecken · Neueröffnungen ab17.10.2026

Dieser Bereich zeigt neutral belegte Augsburger Gastronomie-Neueröffnungen der
letzten60Tage. Keine Geschmacksfreigabe/-sortierung, kein Bewertungsbutton und keine
Profil-Passungshinweise auf diesen Karten. Name, Art, sachliche Beschreibung,
Adresse, Eröffnungsdatum oder belegter Monat und Google-Maps-Link bleiben sichtbar.
Tages-/Monatsangaben über openingDate, Stadtbeleg openingCity und Eröffnungsquelle
openingSourceUrl; unverifizierte und ältere Lokale nicht anzeigen. Neueste zuerst.
Alte Einträge, gespeicherte Orte, Ausblendungen, Profile und Bewertungen bleiben
bestehen. Die gemeinsame Empfehlungsgate-Ausnahme gilt ausschließlich für diese
neutralen Neueröffnungen; Film/Serie/Kultur/Outdoor bleiben streng profilgeprüft.

### Geschmacksprofile für Essen & entdecken entfernt

Auf ausdrücklichen Nutzerwunsch sind restaurant/cafe/beerGarden aus den gespeicherten
Profilen entfernt. Keine Profilbox, Entwürfe oder Bearbeitungsfunktion im neutralen
Neueröffnungsbereich. Andere Profile und alle bisherigen Bewertungen bleiben erhalten;
Legacy-Profilkennungen bleiben ausschließlich lesekompatibel für alte Assessments.

## Musik & Konzerte getrennt von Kultur & Veranstaltungen

Zwei eigene Reiter mit jeweils unabhängiger Top3 im gewählten Zeitraum. Erst die
bestätigte persönliche Freigabe und harte Faktenprüfung, dann bestehende Rangfolge;
keine neuen Gewichte oder Füllplätze. Weitere passende Termine bleiben darunter.
Die Auswahl filtert zuerst nach Kategorie, sodass Musik und Kultur keine Topplätze
voneinander verdrängen. Zeitraum/Sortierung/Vormerkfilter wirken auf den aktiven
Bereich. Das jeweilige Musik-/Kulturprofil und Bewertungsarchiv werden getrennt
angezeigt; gespeicherte Profile/Bewertungen/IDs bleiben unverändert.

Die qualitative Profilanzeige liefert absichtlich keine persönliche Punktzahl.
Sie darf den bestehenden öffentlichen Rangfolgewert einer bereits freigegebenen
Karte nicht löschen; dies hatte zuvor leere Top3 verursachen können. Dieser Wert
wird ausschließlich zur Rangfolge innerhalb freigegebener Kandidaten erhalten.

### Formatvorrang bei gemischten Veranstaltungen

Kabarett, Comedy, Literatur, Lesung, Poetry, Theater, Gespräch, Vortrag und
Ausstellung werden bei der Anzeige als Kultur geführt, auch wenn die Kategorie
zusätzlich Musik/Jazz/Livemusik nennt. Reine Song-Slam-Konzerte und Bandkonzerte
bleiben Musik. Derselbe eventSection-Helfer gilt für Liste, Top3 und Vormerkansicht.
Bestehende persönliche Prüfungen behalten ihre tatsächlich verwendete Profilzuordnung
über eventProfileKey; eine Anzeige-Umsortierung erzeugt keine neue Profilprüfung.
