# Google Kalender: Freizeitplaner

Die Verbindung ist vorbereitet, aber wird erst nach der Einrichtung in deinem Google-Konto aktiv.

1. https://script.google.com/home/start öffnen und ein neues Projekt erstellen, z. B. „Freizeitplaner Sync“.
2. Den gesamten Inhalt von Code.gs in die Datei Code.gs des Projekts einsetzen und speichern.
3. Links bei Dienste auf + klicken, Google Calendar API auswählen und hinzufügen. Bei einem normalen neuen Apps-Script-Projekt wird die API automatisch im zugehörigen Standardprojekt aktiviert.
4. Die Funktion `install` auswählen und ausführen. Den Google-Zugriff und die externen Anfragen freigeben. Ein erster Abgleich und ein Trigger alle fünf Minuten werden eingerichtet.
5. Im Freizeitplaner erscheint nach dem nächsten Laden die Zeit des letzten erfolgreichen Abgleichs.

Kein Web-App-Deployment und keine öffentlich gespeicherten Google-Tokens. Der Trigger läuft unter dem Google-Konto, das `install` ausgeführt hat. Nur ein Projekt installieren. Zum Pausieren `uninstall` ausführen; `install` startet wieder. Bestehende Zuordnungen in den Script Properties behalten.

## Umfang

Der Code verwendet für sämtliche Google-Aufrufe ausschließlich:

`288aa1dd08b3218ae703dae006e7ce15c40a882d7732978073deb16ea0889a7d@group.calendar.google.com`

Der Kalender „Termine“ und andere Kalender werden nicht gelesen oder verändert. Google kann im Berechtigungsdialog dennoch einen allgemeinen Kalenderzugriff anzeigen, weil sein API-Berechtigungsumfang nicht auf diese einzelne Kalender-ID eingeschränkt ist.

- Aktivitäten mit Datum, Start und Ende sowie feste Termine werden aus dem Planer übertragen. Abgelehnte und undatierte Ideen werden nicht übertragen. Freie Zeitfenster sind keine Termine.
- Google-Termine der vergangenen 30 Tage und der nächsten 366 Tage werden als feste Termine importiert. Bereits zugeordnete Einzeltermine werden auch außerhalb dieses Zeitfensters weiter abgeglichen.
- Titel und Zeitpunkt geplanter Aktivitäten können in beiden Kalendern geändert werden. Google-Termine und Serienregeln werden in Google bearbeitet; der Planer bietet Einzel- und Serienlöschung an.
- Wöchentliche Termine werden als echte Google-Serie inklusive Ausnahmen erstellt. Im Planer werden sie anschließend als einzelne, mit der Serie verknüpfte Termine dargestellt.
- Ganztägige und mehrtägige Ereignisse erscheinen pro Tag. Das Löschen eines solchen Tagesblocks löscht das zugehörige Ereignis, bei Serien nur diesen Serientermin.
- Löschen in Google entfernt feste Termine im Planer. Bei Aktivitäten bleibt das Vorschlagsprotokoll erhalten; nur die Kalendereinplanung wird entfernt.
- Bei gleichzeitigen Änderungen an Titel/Zeitpunkt gewinnt Google. Status, Rückmeldung und Vorschlagsdatum bleiben im Planer.
- Deterministische Ereignis-IDs verhindern doppelte Einträge bei Wiederholungsversuchen. Google-ETags und Datenbankrevisionen prüfen gleichzeitige Änderungen. API-Fehler werden nicht als Löschungen interpretiert.

Die App und ihre Planungsdaten bleiben wie gewünscht öffentlich gemeinsam les- und bearbeitbar. Der Kalenderabgleich übernimmt daher auch Änderungen, die über diese öffentliche App vorgenommen werden.

## Prüfung und Fehler

`node tests/google-calendar-sync.cjs` prüft den Abgleich mit simulierten Google- und Datenbank-APIs. `npm run build` und TypeScript prüfen die App. Der echte, kontobezogene Google-Abgleich lässt sich erst nach deiner Einrichtung und Freigabe prüfen.

Bei Fehlern: In Apps Script unter „Ausführungen“ nachsehen, ob die Google Calendar API aktiviert ist und das ausführende Konto Zugriff auf diesen Kalender hat. Der Planer zeigt fehlgeschlagene und länger als 15 Minuten ausbleibende Abgleiche an. Quoten-/Netzwerkfehler werden beim nächsten Trigger erneut versucht.
