# Freizeitvorrat statt Wochenplaner

Die Hauptoberfläche besteht aus Events, Touren & Ideen und Gemerkt. Die Morgenmail zeigt höchstens drei ausgewählte Tipps; alle übrigen Funde bleiben hier abrufbar.

- Events: 90-Tage-Horizont, Fitscore vor Termin, Filter heute/Woche/Wochenende/30Tage/90Tage. Quellenabdeckung sichtbar. Fehlende Bewertungen werden nicht als errechnete Scores dargestellt.
- Wanderungen und Fahrradtouren: dauerhafte Sammlung, getrennt von einem veralteten Wochenenddatum. Grundsätzliche Passung und Bedingungen getrennt anzeigen; Wetter und Sperrungen vor dem Ausflug prüfen. Keine automatische Behauptung einer sicheren Befahrbarkeit.
- Restaurants, Kino, Streaming und pflegbare bekannte Aktivitäten bleiben erhalten. Filmideen verschwinden nicht nach60Tagen; aktuelle Verfügbarkeit muss beim Anbieter geprüft werden.
- Favoriten, Bewertungen, Ausblendungen und Routinen verwenden weiter die bestehenden Supabase-Tabellen. Die Kalender-/Wochenplaner-Oberfläche wird ausgeblendet; vorhandene Daten werden nicht gelöscht. Neue Aktionen benötigen weiterhin einen Benutzerklick.
- Events und Touren können ebenfalls ausgeblendet werden. Scheitert das Laden der Ausschlüsse, wird keine Liste angezeigt, die versteckte Vorschläge wiederherstellt.

Der Katalog wird bevorzugt aus `https://fahrrad-zur-arbei.vercel.app/api/leisure/catalog` geladen. Mit `VITE_MORNING_CATALOG_URL` kann eine andere zentrale Origin konfiguriert werden. Deaktivierter/unerreichbarer Worker: alter Supabase-Katalog, danach vorhandene JSON-Datei als Rückfall. Keine Zugangsdaten in URLs; die öffentliche Katalogschnittstelle enthält weder Kalender noch Routinen, persönliche Rückmeldungen oder Häkchen.

Der neue API-Worker und der kontrollierte Wechsel der Nacht-Recherche liegen im Repository `fahrrad-zur-arbei`, Modul04. Beide Änderungen gemeinsam integrieren; die App kann wegen ihres Rückfalls vorher veröffentlicht werden. Vor Aktivierung einen echten API-/DB-/Browser-Test durchführen. Noch kein Produktionswechsel durch diesen Fachchat.

Geprüft: drei reine Sammlungstests, TypeScript und Vite-Produktionsbuild. Neue UI nicht im Browser geprüft. Bestehende Daten nicht zu Testzwecken verändert.
# Prüfung 10.10.2026: Quellenstand ehrlich anzeigen

Die integrierte Live-App liest bereits den zentralen Katalog. Dieser enthält36 importierte Ideen;28 allgemeine Quellenprüfungen fehlen. Ein fehlgeschlagener Einzelcheck ist kein vollständiger Quellenlauf und verifiziert den Import nicht.

Die Quellenanzeige trennt nun „noch nicht geprüft“, „Prüfung fehlgeschlagen“, „Prüfung veraltet“ und „geprüft“. Vorhandene Originalprüfzeiten bleiben erhalten; fehlende Prüfungen erhalten keine Speicher-/Abrufzeit. „Sammlung gespeichert“ bezeichnet ausschließlich den Speicherstand. Einzelchecks werden separat gezählt. Keine Bewertungen, Favoriten oder versteckten IDs geändert.

Validierung:4/4 Tests, TypeScript und Vite-Produktionsbuild. Morgenassistent-Fix separat in dessen Modul04 dokumentiert. Keine neue kostenpflichtige Recherche oder Produktionsdatenänderung während der Diagnose. Veröffentlichung erfolgt über00.


## Kostenarme Katalogpflege · 10.10.2026 · Vorschlag für00

Die Recherche lebt im Morgenassistenten; die App bleibt die öffentliche Sammlung mit unveränderten Favoriten, Bewertungen und ausgeblendeten IDs. Der gemeinsame Katalog unterstützt direkte öffentliche strukturierte Originaldaten und begrenzte KI-Ersatzprüfungen. Unveränderte geprüfte Events benötigen keine KI-Neuverarbeitung; Import/DB-Lektüre verifizieren keine Idee. Die Morgenmail wählt täglich maximal drei Tipps im Code.

Quellenchecks dürfen optional `method`, `directError` und `nextAttemptAt` tragen. Die App zeigt unverändert missing/failed/stale/checked; ergänzend erläutert sie gemeinsame Job-/Freizeitbudgetpausen, begrenzte KI-Ersatzprüfungen, unveränderte ungeklärte Seiten und den frühestmöglichen Wiederholungsversuch. Letzter erfolgreicher Prüfzeitpunkt bleibt separat, fehlende Evidenz bleibt ohne Datum. Keine Kosten-/Token-/Kalenderdaten im öffentlichen Katalog, keine Recherche aus dem App-Frontend.

Getestet:5/5 Collection-Tests, TypeScript und Vite-Produktionsbuild erfolgreich. Keine produktiven Schreibaktionen. Abhängigkeit: Morgenassistent stellt die optionalen öffentlichen Prüfmetadaten bereit; ältere Katalogantworten bleiben kompatibel. Branch/PR erst durch00 integrieren/aktivieren.
