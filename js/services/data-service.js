import {stateManager} from './state-manager.js';
import {formatDate, parseDate} from '../utils/formatters.js';
import {cantonMap, coatOfArms, fallbackCoat, sparqlQueryCanton, sparqlQueryNational} from '../constants.js';

async function fetchSparql(queryText) {
    const endpoint = 'https://ld.admin.ch/query';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json'
        },
        body: queryText
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
}

function transformNationalMeta(sparqlResult) {
    const bindings = sparqlResult?.results?.bindings || [];
    return bindings.map(b => ({
        date: b.date?.value,
        title: b.titleText?.value,
        accepted: b.accepted?.value === "1" || b.accepted?.value === "true" || b.accepted?.value === true
    }));
}

export async function fetchLiveResults() {
    const [cantonResult, nationalResult] = await Promise.all([
        fetchSparql(sparqlQueryCanton),
        fetchSparql(sparqlQueryNational)
    ]);
    const nationalReferenda = transformNationalMeta(nationalResult);

    return transformSparqlData(cantonResult, nationalReferenda);
}

function transformSparqlData(sparqlResult, nationalReferenda = []) {
    const bindings = sparqlResult?.results?.bindings || [];
    const referendaByDate = d3.group(nationalReferenda, d => d.date);
    const groupedByVote = new Map();

    bindings.forEach(b => {
        if (!b.date || !b.region || !b.participation) return;

        const date = b.date.value;
        const regionUri = b.region.value;
        const participation = parseFloat(b.participation.value);

        const cantonInfo = cantonMap[regionUri] || {
            id: regionUri.split('/').pop(),
            label: regionUri.split('/').pop()
        };

        const referendaOnDate = referendaByDate.get(date) || [{
            title: `Popular Vote on ${date}`,
            accepted: ''
        }];

        referendaOnDate.forEach(ref => {
            const voteKey = `${date}||${ref.title || ''}`;

            if (!groupedByVote.has(voteKey)) {
                groupedByVote.set(voteKey, {
                    id: voteKey,
                    date,
                    title: ref.title || `Popular Vote on ${date}`,
                    accepted: ref.accepted ?? '',
                    cantons: []
                });
            }

            groupedByVote.get(voteKey).cantons.push({
                id: cantonInfo.id,
                label: cantonInfo.label,
                value: participation
            });
        });
    });

    return Array.from(groupedByVote.values())
        .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export async function loadData() {
    let rawData;
    try {
        rawData = await fetchLiveResults();
    } catch (err) {
        console.error('Failed to fetch live data, falling back to data.json', err);
        rawData = await d3.json("data.json");
    }

    const data = rawData.flatMap((vote, voteIndex) => {
        const date = parseDate(vote.date);
        return vote.cantons.map(canton => ({
            voteId: vote.id,
            voteIndex,
            date,
            dateLabel: formatDate(date),
            title: vote.title,
            accepted: vote.accepted,
            id: canton.id,
            label: canton.label,
            value: Number(canton.value),
            coat: coatOfArms[canton.id] ?? fallbackCoat
        }));
    }).sort((a, b) => d3.ascending(a.date, b.date));

    const votes = rawData
        .map((d, index) => {
            return {
                ...d,
                index,
                dateObj: parseDate(d.date),
                dateLabel: formatDate(parseDate(d.date)),
            };
        })
        .sort((a, b) => d3.ascending(a.dateObj, b.dateObj));

    for (const vote of votes) {
        vote.cantonById = new Map((vote.cantons || []).map(c => [c.id, c]));
    }

    const cantonIds = Array.from(new Set(data.map(d => d.id))).sort(d3.ascending);
    const series = Array.from(
        d3.group(data, d => d.id),
        ([id, values]) => ({
            id,
            label: values[0]?.label ?? id,
            coat: values[0]?.coat ?? fallbackCoat,
            values: values.sort((a, b) => d3.ascending(a.date, b.date))
        })
    );

    const voteEntriesById = d3.group(data, d => d.voteId);

    stateManager.setData(data, votes, cantonIds, series, voteEntriesById);
}
