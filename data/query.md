SELECT ?date ?cantonAbrv ?cantonId ?actorName ?actorImageUrl (AVG(?participation) AS ?participation) WHERE 
{
  <https://politics.ld.admin.ch/political-rights/popular-vote/1> <https://cube.link/observationSet> ?observationSet0 .
  ?observationSet0 <https://cube.link/observation> ?votation .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/region> ?region .
  ?region a <https://schema.ld.admin.ch/Canton> .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/stimmbeteiligung> ?participation .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/date> ?date .
  ?region <http://schema.org/alternateName> ?cantonAbrv .
  ?region <http://schema.org/identifier> ?cantonId .

  OPTIONAL {
    <https://politics.ld.admin.ch/fc/cube-councillor> <https://cube.link/observationSet> ?observationSet1 .
    ?observationSet1 <https://cube.link/observation> ?councillorSource .
    ?actor <http://schema.org/name> ?actorName .
    ?councillorSource <http://schema.org/actor> ?actor .
    ?councillorSource <http://schema.org/addressRegion> ?region .
    ?councillorSource <http://schema.org/startDate> ?startDate .
    OPTIONAL { ?councillorSource <http://schema.org/endDate> ?endDate . }
    FILTER (?startDate <= ?date && (?endDate = ""^^<https://cube.link/Undefined> || ?endDate >= ?date))
    BIND(CONCAT("https://www.assets.bk.admin.ch/livingdocs/resources/images/person/", REPLACE(STR(?actor), "^.*/", ""), ".png") AS ?actorImageUrl)
  }
}

GROUP BY ?date ?cantonAbrv ?cantonId ?actorName ?actorImageUrl
ORDER BY DESC(?date) ?cantonId