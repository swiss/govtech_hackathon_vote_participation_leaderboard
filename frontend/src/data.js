const sparqlQuery = `SELECT ?date ?region (AVG(?participation) AS ?participation) WHERE {
  <https://politics.ld.admin.ch/political-rights/popular-vote/1> <https://cube.link/observationSet> ?observationSet0 .
  ?observationSet0 <https://cube.link/observation> ?votation .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/region> ?region .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/stimmbeteiligung> ?participation .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/date> ?date .

  FILTER(STRSTARTS(STR(?region), "https://ld.admin.ch/canton/"))
}
GROUP BY ?date ?region
ORDER BY DESC(?date) ?region
LIMIT 20`;

const cantonMap = {
    'https://ld.admin.ch/canton/1': { id: 'ZH', label: 'Zürich', councillor: 1 },
    'https://ld.admin.ch/canton/2': { id: 'BE', label: 'Bern', councillor: 1 },
    'https://ld.admin.ch/canton/3': { id: 'LU', label: 'Luzern', councillor: 0 },
    'https://ld.admin.ch/canton/4': { id: 'UR', label: 'Uri', councillor: 0 },
    'https://ld.admin.ch/canton/5': { id: 'SZ', label: 'Schwyz', councillor: 0 },
    'https://ld.admin.ch/canton/6': { id: 'OW', label: 'Obwalden', councillor: 0 },
    'https://ld.admin.ch/canton/7': { id: 'NW', label: 'Nidwalden', councillor: 0 },
    'https://ld.admin.ch/canton/8': { id: 'GL', label: 'Glarus', councillor: 0 },
    'https://ld.admin.ch/canton/9': { id: 'ZG', label: 'Zug', councillor: 0 },
    'https://ld.admin.ch/canton/10': { id: 'FR', label: 'Freiburg', councillor: 1 },
    'https://ld.admin.ch/canton/11': { id: 'SO', label: 'Solothurn', councillor: 0 },
    'https://ld.admin.ch/canton/12': { id: 'BS', label: 'Basel-Stadt', councillor: 1 },
    'https://ld.admin.ch/canton/13': { id: 'BL', label: 'Basel-Landschaft', councillor: 0 },
    'https://ld.admin.ch/canton/14': { id: 'SH', label: 'Schaffhausen', councillor: 0 },
    'https://ld.admin.ch/canton/15': { id: 'AR', label: 'Appenzell Ausserrhoden', councillor: 0 },
    'https://ld.admin.ch/canton/16': { id: 'AI', label: 'Appenzell Innerrhoden', councillor: 0 },
    'https://ld.admin.ch/canton/17': { id: 'SG', label: 'St. Gallen', councillor: 1 },
    'https://ld.admin.ch/canton/18': { id: 'GR', label: 'Graubünden', councillor: 0 },
    'https://ld.admin.ch/canton/19': { id: 'AG', label: 'Aargau', councillor: 0 },
    'https://ld.admin.ch/canton/20': { id: 'TG', label: 'Thurgau', councillor: 0 },
    'https://ld.admin.ch/canton/21': { id: 'TI', label: 'Tessin', councillor: 1 },
    'https://ld.admin.ch/canton/22': { id: 'VD', label: 'Waadt', councillor: 1 },
    'https://ld.admin.ch/canton/23': { id: 'VS', label: 'Wallis', councillor: 1 },
    'https://ld.admin.ch/canton/24': { id: 'NE', label: 'Neuenburg', councillor: 0 },
    'https://ld.admin.ch/canton/25': { id: 'GE', label: 'Genf', councillor: 0 },
    'https://ld.admin.ch/canton/26': { id: 'JU', label: 'Jura', councillor: 0 }
};

export async function getData() {
  const endpoint = 'https://ld.admin.ch/query';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      },
      body: sparqlQuery
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    const bindings = result.results.bindings;
    
    // For the simple leaderboard, we might just want the latest vote
    if (bindings.length === 0) return [];
    
    const latestDate = bindings[0].date.value;
    const latestVoteData = bindings.filter(b => b.date.value === latestDate);
    
    return latestVoteData.map((b, i) => {
      const regionUri = b.region.value;
      const cantonInfo = cantonMap[regionUri] || { id: regionUri.split('/').pop(), label: regionUri.split('/').pop(), councillor: 0 };
      return {
        id: cantonInfo.id,
        value: parseFloat(b.participation.value),
        label: cantonInfo.label,
        FederalCouncillor: cantonInfo.councillor
      };
    });
  } catch (err) {
    console.error('Failed to fetch live data', err);
    return [];
  }
}