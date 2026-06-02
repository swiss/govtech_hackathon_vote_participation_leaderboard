# govtech_hackathon_vote_participation_leaderboard

## Architektur Update (Modularisierung)

Das Projekt wurde auf eine modulare Architektur umgestellt, um die Wartbarkeit und Testbarkeit zu verbessern.

- **Einstiegspunkt**: `js/main.js` (wird in `index.html` als `type="module"` geladen).
- **Module**: Alle Logiken für Charts, Daten-Services und State-Management befinden sich im Verzeichnis `js/`.
- **Legacy**: Die Datei `script.js` ist **deprecated** (veraltet) und dient nur noch als Referenz. Sie sollte für neue
  Features nicht mehr verwendet werden.

## Data Fetching

A script `fetch_data.js` is provided to fetch live voter participation data from `ld.admin.ch/query` and transform it into the format required by the frontend.

To run it:
```bash
node fetch_data.js
```

This will create `data/query_results.json` (raw) and `data/transformed_data.json` (formatted).

The frontends have also been updated to fetch this data dynamically.
