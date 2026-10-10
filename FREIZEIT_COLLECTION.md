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
