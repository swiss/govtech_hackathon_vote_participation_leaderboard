# govtech_hackathon_vote_participation_leaderboard
## Data Fetching

A script `fetch_data.js` is provided to fetch live voter participation data from `ld.admin.ch/query` and transform it into the format required by the frontend.

To run it:
```bash
node fetch_data.js
```

This will create `data/query_results.json` (raw) and `data/transformed_data.json` (formatted).

The frontends have also been updated to fetch this data dynamically.
