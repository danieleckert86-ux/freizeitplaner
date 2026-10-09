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
