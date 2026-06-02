export const coatOfArms = {
    ZH: "assets/cantons/zh.svg",
    BE: "assets/cantons/be.svg",
    LU: "assets/cantons/lu.svg",
    UR: "assets/cantons/ur.svg",
    SZ: "assets/cantons/sz.svg",
    OW: "assets/cantons/ow.svg",
    NW: "assets/cantons/nw.svg",
    GL: "assets/cantons/gl.svg",
    ZG: "assets/cantons/zg.svg",
    FR: "assets/cantons/fr.svg",
    SO: "assets/cantons/so.svg",
    BS: "assets/cantons/bs.svg",
    BL: "assets/cantons/bl.svg",
    SH: "assets/cantons/sh.svg",
    AR: "assets/cantons/ar.svg",
    AI: "assets/cantons/ai.svg",
    SG: "assets/cantons/sg.svg",
    GR: "assets/cantons/gr.svg",
    AG: "assets/cantons/ag.svg",
    TG: "assets/cantons/tg.svg",
    TI: "assets/cantons/ti.svg",
    VD: "assets/cantons/vd.svg",
    VS: "assets/cantons/vs.svg",
    NE: "assets/cantons/ne.svg",
    GE: "assets/cantons/ge.svg",
    JU: "assets/cantons/ju.svg"
};

export const fallbackCoat = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%23fff'/%3E%3Ctext x='32' y='39' text-anchor='middle' font-family='Arial' font-size='18' font-weight='700' fill='%23111827'%3ECH%3C/text%3E%3C/svg%3E";

export const CHART_CONFIG = {
    width: 980,
    height: 620,
    margin: {top: 28, right: 88, bottom: 58, left: 64}
};

export const cantonMap = {
    'https://ld.admin.ch/canton/1': {id: 'ZH', label: 'Zürich'},
    'https://ld.admin.ch/canton/2': {id: 'BE', label: 'Bern'},
    'https://ld.admin.ch/canton/3': {id: 'LU', label: 'Luzern'},
    'https://ld.admin.ch/canton/4': {id: 'UR', label: 'Uri'},
    'https://ld.admin.ch/canton/5': {id: 'SZ', label: 'Schwyz'},
    'https://ld.admin.ch/canton/6': {id: 'OW', label: 'Obwalden'},
    'https://ld.admin.ch/canton/7': {id: 'NW', label: 'Nidwalden'},
    'https://ld.admin.ch/canton/8': {id: 'GL', label: 'Glarus'},
    'https://ld.admin.ch/canton/9': {id: 'ZG', label: 'Zug'},
    'https://ld.admin.ch/canton/10': {id: 'FR', label: 'Freiburg'},
    'https://ld.admin.ch/canton/11': {id: 'SO', label: 'Solothurn'},
    'https://ld.admin.ch/canton/12': {id: 'BS', label: 'Basel-Stadt'},
    'https://ld.admin.ch/canton/13': {id: 'BL', label: 'Basel-Landschaft'},
    'https://ld.admin.ch/canton/14': {id: 'SH', label: 'Schaffhausen'},
    'https://ld.admin.ch/canton/15': {id: 'AR', label: 'Appenzell Ausserrhoden'},
    'https://ld.admin.ch/canton/16': {id: 'AI', label: 'Appenzell Innerrhoden'},
    'https://ld.admin.ch/canton/17': {id: 'SG', label: 'St. Gallen'},
    'https://ld.admin.ch/canton/18': {id: 'GR', label: 'Graubünden'},
    'https://ld.admin.ch/canton/19': {id: 'AG', label: 'Aargau'},
    'https://ld.admin.ch/canton/20': {id: 'TG', label: 'Thurgau'},
    'https://ld.admin.ch/canton/21': {id: 'TI', label: 'Tessin'},
    'https://ld.admin.ch/canton/22': {id: 'VD', label: 'Waadt'},
    'https://ld.admin.ch/canton/23': {id: 'VS', label: 'Wallis'},
    'https://ld.admin.ch/canton/24': {id: 'NE', label: 'Neuenburg'},
    'https://ld.admin.ch/canton/25': {id: 'GE', label: 'Genf'},
    'https://ld.admin.ch/canton/26': {id: 'JU', label: 'Jura'}
};

export const sparqlQueryCanton = `
SELECT ?date ?region (AVG(?participation) AS ?participation) 
WHERE {
  <https://politics.ld.admin.ch/political-rights/popular-vote/1> <https://cube.link/observationSet> ?observationSet0 .
  ?observationSet0 <https://cube.link/observation> ?votation .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/region> ?region .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/stimmbeteiligung> ?participation .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/date> ?date .

  FILTER(STRSTARTS(STR(?region), "https://ld.admin.ch/canton/"))
}
GROUP BY ?date ?region
ORDER BY DESC(?date) ?region`;

export const sparqlQueryNational = `
PREFIX schema: <http://schema.org/>

SELECT ?date ?department ?titleText ?accepted
WHERE {
    <https://politics.ld.admin.ch/political-rights/popular-vote/1> <https://cube.link/observationSet> ?observationSet0 .
    ?observationSet0 <https://cube.link/observation> ?votation .
    ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/region> ?region .
    ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/date> ?date .
    ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/abstimmungstitel> ?title .
    ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/departementHist> ?dept1 .
    ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/ergebnisBinary> ?accepted .

    ?title schema:name ?titleText .
    ?dept1 schema:name ?department .

    FILTER(STR(?region) = "https://ld.admin.ch/country/CHE")
    FILTER(LANG(?titleText) = "de")
    FILTER(LANG(?department) = "de")
}

ORDER BY DESC(?date)
`;
