
// -------------------------------------------------------------------------
// 1) Daten laden
// -------------------------------------------------------------------------
const coatOfArms = {
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

const fallbackCoat = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%23fff'/%3E%3Ctext x='32' y='39' text-anchor='middle' font-family='Arial' font-size='18' font-weight='700' fill='%23111827'%3ECH%3C/text%3E%3C/svg%3E";

let data = [];
let votes = [];
let cantonIds = [];
let series = [];
let activeCanton = null;
let selectedCompareCantons = new Set();
const voteMetaByDate = new Map();
let state = {
    fromIndex: 0,
    toIndex: 0,
    rankingMode: "avg"
};

function toggleCantonSelection(id) {
    if (selectedCompareCantons.has(id)) {
        selectedCompareCantons.delete(id);
    } else {
        selectedCompareCantons.add(id);
    }
    update();
}

const parseDate = d3.timeParse("%Y-%m-%d");
const formatDate = d3.timeFormat("%d.%m.%Y");
const formatValue = d3.format(".1f");

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getAcceptedBadge(accepted) {
    const normalized = String(accepted ?? "").trim().toLowerCase();
    if (normalized === "1" || normalized === "true") {
        return `<span style="color:#16a34a;font-weight:800;">✓</span>`;
    }
    if (normalized === "0" || normalized === "false") {
        return `<span style="color:#dc2626;font-weight:800;">✗</span>`;
    }
    return `<span style="color:#64748b;font-weight:800;">•</span>`;
}

// DOM + D3 Globals
const svg = d3.select("#chart");
const rankTimelineSvg = d3.select("#rankTimelineChart");
const tooltip = d3.select("#tooltip");
const rankingList = d3.select("#rankingList");
const cantonFilter = document.querySelector("#cantonFilter");
const lineChartWrap = document.querySelector("#chart")?.closest(".chart-wrap");
const lineHoverDateBox = document.createElement("div");
lineHoverDateBox.className = "line-hover-date-box";
if (lineChartWrap) {
    lineChartWrap.appendChild(lineHoverDateBox);
}

function syncCantonFilterSelection() {
    if (!cantonFilter) return;
    const checkboxes = cantonFilter.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach(input => {
        input.checked = selectedCompareCantons.has(input.value);
    });
}

function renderCantonFilter() {
    if (!cantonFilter) return;

    cantonFilter.innerHTML = "";
    cantonFilter.style.display = "flex";
    cantonFilter.style.flexWrap = "wrap";
    cantonFilter.style.gap = "8px 12px";
    cantonFilter.style.marginTop = "10px";
    cantonFilter.style.maxHeight = "132px";
    cantonFilter.style.overflowY = "auto";

    const sortedSeries = [...series].sort((a, b) => d3.ascending(a.id, b.id));
    sortedSeries.forEach(s => {
        const label = document.createElement("label");
        label.style.display = "inline-flex";
        label.style.alignItems = "center";
        label.style.gap = "6px";
        label.style.cursor = "pointer";
        label.style.fontSize = "12px";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = s.id;
        checkbox.checked = selectedCompareCantons.has(s.id);

        checkbox.addEventListener("change", () => {
            if (checkbox.checked) selectedCompareCantons.add(s.id);
            else selectedCompareCantons.delete(s.id);

            if (activeCanton && selectedCompareCantons.size > 0 && !selectedCompareCantons.has(activeCanton)) {
                activeCanton = null;
                tooltip.classed("visible", false);
                lineHoverDateBox.classList.remove("visible");
                g.selectAll("circle.hover-dot").remove();
            }

            update();
        });

        const coat = document.createElement("img");
        coat.src = s.coat || fallbackCoat;
        coat.alt = "";
        coat.width = 16;
        coat.height = 16;
        coat.style.objectFit = "contain";
        coat.style.border = "1px solid var(--border)";
        coat.style.borderRadius = "3px";
        coat.style.background = "#fff";

        const name = document.createElement("span");
        name.textContent = s.id;

        label.appendChild(checkbox);
        label.appendChild(coat);
        label.appendChild(name);
        cantonFilter.appendChild(label);
    });
}

const fromSlider = document.querySelector("#fromSlider");
const toSlider = document.querySelector("#toSlider");
const rangeLabel = document.querySelector("#rangeLabel");
const rankingMode = document.querySelector("#rankingMode");
const rankAggregationSelect = document.querySelector("#rankAggregation");
const resetButton = document.querySelector("#resetButton");
const replayRaceButton = document.querySelector("#replayRaceButton");
const pauseRaceButton = document.querySelector("#pauseRaceButton");
const raceSpeedSelect = document.querySelector("#raceSpeed");
const raceContainer = document.querySelector("#raceContainer");
const raceDateLabel = document.querySelector("#raceDateLabel");
const rankingDescription = document.querySelector("#rankingDescription");
const topCanton = document.querySelector("#topCanton");
const topCantonSub = document.querySelector("#topCantonSub");
const sportModeToggle = document.querySelector("#sportModeToggle");

// Audio for Sport Mode
const sportAudio = new Audio('TTS/output.wav');
sportAudio.preload = 'auto';

function normalizeDatasetDate(rawDate) {
    if (!rawDate) return null;
    const value = String(rawDate).trim();
    const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
}

async function loadVoteMetadataFromCsv() {
    const csvText = await d3.text("data/DATASET CSV 28-05-2026.csv");
    const rows = d3.dsvFormat(";").parse(csvText);
    voteMetaByDate.clear();

    rows.forEach(row => {
        const dateKey = normalizeDatasetDate(row["datum"]);
        if (!dateKey || voteMetaByDate.has(dateKey)) return;
        const acceptedRaw = String(row["annahme"] ?? "").trim();
        const accepted = acceptedRaw === "1";
        const title = String(row["titel_off_d"] || row["titel_kurz_d"] || "").trim();
        voteMetaByDate.set(dateKey, { title, accepted });
    });
}

// Helper to handle sport audio
function syncSportAudio(action) {
    if (!sportModeToggle || !sportModeToggle.checked) {
        sportAudio.pause();
        return;
    }

    if (action === 'play') {
        sportAudio.play().catch(e => console.log("Audio play failed:", e));
    } else if (action === 'pause') {
        sportAudio.pause();
    } else if (action === 'stop') {
        sportAudio.pause();
        sportAudio.currentTime = 0;
    }
}

function applySportModeDesign(isSportMode) {
    document.body.classList.toggle("fun-mode", Boolean(isSportMode));
}

function setSportModeRaceStartDate() {
    if (!votes.length) return;
    const sportStartDate = parseDate("2002-03-03");
    if (!sportStartDate) return;

    let sportStartIndex = votes.findIndex(v => v.dateObj?.getTime() === sportStartDate.getTime());
    if (sportStartIndex < 0) {
        sportStartIndex = votes.findIndex(v => v.dateObj && v.dateObj >= sportStartDate);
    }
    if (sportStartIndex < 0) return;

    state.fromIndex = sportStartIndex;
    if (state.toIndex < state.fromIndex) {
        state.toIndex = state.fromIndex;
    }
    fromSlider.value = state.fromIndex;
    toSlider.value = state.toIndex;
    updateSliderTrack();
    update();
}

if (sportModeToggle) {
    applySportModeDesign(sportModeToggle.checked);

    sportModeToggle.addEventListener("change", () => {
        applySportModeDesign(sportModeToggle.checked);

        if (!sportModeToggle.checked) {
            syncSportAudio('stop');
        } else if (raceInterval && !raceIsPaused) {
            syncSportAudio('play');
        }

        if (sportModeToggle.checked) {
            setSportModeRaceStartDate();
        }
        
        // Beim Umschalten des Sportmodus Race immer neu aufbauen,
        // damit Filter + Startdatum sofort im RaceDateLabel sichtbar sind.
        const wasPaused = raceIsPaused;
        startRace(!wasPaused);
    });
}

// Slider Track Active Element
const sliderContainer = document.querySelector(".range-slider-container");
const sliderTrackActive = document.createElement("div");
sliderTrackActive.className = "slider-track-active";
sliderContainer.appendChild(sliderTrackActive);

const width = 980;
const height = 620;
const margin = { top: 28, right: 88, bottom: 58, left: 64 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleTime().range([0, innerWidth]);
const y = d3.scaleLinear().range([innerHeight, 0]);
const color = d3.scaleOrdinal().range(d3.schemeTableau10.concat(d3.schemeSet3));

const line = d3.line()
    .defined(d => Number.isFinite(d.value))
    .x(d => x(d.date))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

// Statische Elemente vorbereiten
g.append("g").attr("class", "grid");
g.append("g").attr("class", "axis y-axis");
g.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${innerHeight})`);

g.append("text")
    .attr("x", -innerHeight / 2)
    .attr("y", -44)
    .attr("transform", "rotate(-90)")
    .attr("fill", "#475569")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .attr("text-anchor", "middle")
    .text("Wert");

const rangeWindow = g.append("rect")
    .attr("class", "range-window")
    .attr("y", 0)
    .attr("height", innerHeight)
    .attr("rx", 10);

const seriesGroup = g.append("g").attr("class", "series-group");
const labelsGroup = g.append("g").attr("class", "labels-group");

const sparqlQuery = `SELECT ?date ?region (AVG(?participation) AS ?participation) WHERE {
  <https://politics.ld.admin.ch/political-rights/popular-vote/1> <https://cube.link/observationSet> ?observationSet0 .
  ?observationSet0 <https://cube.link/observation> ?votation .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/region> ?region .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/stimmbeteiligung> ?participation .
  ?votation <https://politics.ld.admin.ch/political-rights/popular-vote/date> ?date .

  FILTER(STRSTARTS(STR(?region), "https://ld.admin.ch/canton/"))
}
GROUP BY ?date ?region
ORDER BY DESC(?date) ?region`;

const sparqlQueryNational = `
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

const cantonMap = {
    'https://ld.admin.ch/canton/1': { id: 'ZH', label: 'Zürich' },
    'https://ld.admin.ch/canton/2': { id: 'BE', label: 'Bern' },
    'https://ld.admin.ch/canton/3': { id: 'LU', label: 'Luzern' },
    'https://ld.admin.ch/canton/4': { id: 'UR', label: 'Uri' },
    'https://ld.admin.ch/canton/5': { id: 'SZ', label: 'Schwyz' },
    'https://ld.admin.ch/canton/6': { id: 'OW', label: 'Obwalden' },
    'https://ld.admin.ch/canton/7': { id: 'NW', label: 'Nidwalden' },
    'https://ld.admin.ch/canton/8': { id: 'GL', label: 'Glarus' },
    'https://ld.admin.ch/canton/9': { id: 'ZG', label: 'Zug' },
    'https://ld.admin.ch/canton/10': { id: 'FR', label: 'Freiburg' },
    'https://ld.admin.ch/canton/11': { id: 'SO', label: 'Solothurn' },
    'https://ld.admin.ch/canton/12': { id: 'BS', label: 'Basel-Stadt' },
    'https://ld.admin.ch/canton/13': { id: 'BL', label: 'Basel-Landschaft' },
    'https://ld.admin.ch/canton/14': { id: 'SH', label: 'Schaffhausen' },
    'https://ld.admin.ch/canton/15': { id: 'AR', label: 'Appenzell Ausserrhoden' },
    'https://ld.admin.ch/canton/16': { id: 'AI', label: 'Appenzell Innerrhoden' },
    'https://ld.admin.ch/canton/17': { id: 'SG', label: 'St. Gallen' },
    'https://ld.admin.ch/canton/18': { id: 'GR', label: 'Graubünden' },
    'https://ld.admin.ch/canton/19': { id: 'AG', label: 'Aargau' },
    'https://ld.admin.ch/canton/20': { id: 'TG', label: 'Thurgau' },
    'https://ld.admin.ch/canton/21': { id: 'TI', label: 'Tessin' },
    'https://ld.admin.ch/canton/22': { id: 'VD', label: 'Waadt' },
    'https://ld.admin.ch/canton/23': { id: 'VS', label: 'Wallis' },
    'https://ld.admin.ch/canton/24': { id: 'NE', label: 'Neuenburg' },
    'https://ld.admin.ch/canton/25': { id: 'GE', label: 'Genf' },
    'https://ld.admin.ch/canton/26': { id: 'JU', label: 'Jura' }
};

async function fetchLiveResults() {
    const [cantonResult, nationalResult] = await Promise.all([
        fetchSparql(sparqlQuery),
        fetchSparql(sparqlQueryNational)
    ]);
    const nationalReferenda = transformNationalMeta(nationalResult);
    return transformSparqlData(cantonResult, nationalReferenda);
}

function transformSparqlData(sparqlResult, nationalReferenda = []) {
    const bindings = sparqlResult.results.bindings || [];
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
                    accepted: ref.accepted || '',
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
    const bindings = sparqlResult.results.bindings || [];
    return bindings.map(b => ({
        date: b.date?.value,
        title: b.titleText?.value,
        accepted: b.accepted?.value
    }));
}

loadVoteMetadataFromCsv()
    .catch(err => console.warn("Failed to load vote metadata CSV", err))
    .finally(() => {
        fetchLiveResults().then(liveData => {
            init(liveData);
        }).catch(err => {
            console.error('Failed to fetch live data, falling back to data.json', err);
            d3.json("data.json").then(rawData => {
                init(rawData);
            });
        });
    });

function init(rawData) {
    // -------------------------------------------------------------------------
    // 2) Daten normalisieren: nested -> long format
    // -------------------------------------------------------------------------
    data = rawData.flatMap((vote, voteIndex) => {
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

    votes = rawData
        .map((d, index) => {
            const meta = voteMetaByDate.get(d.date);
            return {
                ...d,
                index,
                dateObj: parseDate(d.date),
                dateLabel: formatDate(parseDate(d.date)),
                title: meta?.title || d.title || `Abstimmung ${d.date}`,
                accepted: meta?.accepted
            };
        })
        .sort((a, b) => d3.ascending(a.dateObj, b.dateObj));

    cantonIds = Array.from(new Set(data.map(d => d.id))).sort(d3.ascending);
    series = Array.from(
        d3.group(data, d => d.id),
        ([id, values]) => ({
            id,
            label: values[0]?.label ?? id,
            coat: values[0]?.coat ?? fallbackCoat,
            values: values.sort((a, b) => d3.ascending(a.date, b.date))
        })
    );

    renderCantonFilter();

    // -------------------------------------------------------------------------
    // 3) UI initialisieren (Standard: Ganze Zeitspanne)
    // -------------------------------------------------------------------------
    state.fromIndex = 0;
    state.toIndex = votes.length - 1;

    fromSlider.min = 0;
    fromSlider.max = votes.length - 1;
    fromSlider.value = state.fromIndex;

    toSlider.min = 0;
    toSlider.max = votes.length - 1;
    toSlider.value = state.toIndex;

    if (sportModeToggle?.checked) {
        setSportModeRaceStartDate();
    }

    x.domain(d3.extent(data, d => d.date));
    y.domain(d3.extent(data, d => d.value)).nice();
    color.domain(cantonIds);

    g.select(".grid").call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(""));
    g.select(".y-axis").call(d3.axisLeft(y).ticks(6).tickFormat(d => `${d}`));
    g.select(".x-axis")
        .transition().duration(400)
        .call(d3.axisBottom(x).ticks(Math.min(votes.length, 6)).tickFormat(d3.timeFormat("%m.%Y")));

    seriesGroup.selectAll("path.line")
        .data(series, d => d.id)
        .join("path")
        .attr("class", "line")
        .attr("data-id", d => d.id)
        .attr("stroke", d => color(d.id))
        .transition().duration(400)
        .attr("d", d => line(d.values))
        .selection()
        .on("pointerenter", (event, d) => setActiveCanton(d.id, event))
        .on("pointermove", (event, d) => {
            setActiveCanton(d.id, event);
            showTooltip(event, d);
        })
        .on("pointerleave", () => setActiveCanton(null));

    seriesGroup.selectAll("path.hit-line")
        .data(series, d => d.id)
        .join("path")
        .attr("class", "hit-line")
        .attr("fill", "none")
        .attr("stroke", "transparent")
        .attr("stroke-width", 16)
        .attr("pointer-events", "stroke")
        .transition().duration(400)
        .attr("d", d => line(d.values))
        .selection()
        .on("pointerenter", (event, d) => setActiveCanton(d.id, event))
        .on("pointermove", (event, d) => {
            setActiveCanton(d.id, event);
            showTooltip(event, d);
        })
        .on("pointerleave", () => setActiveCanton(null));

    labelsGroup.selectAll("text")
        .data(series, d => d.id)
        .join("text")
        .attr("dy", "0.32em")
        .attr("fill", d => color(d.id))
        .attr("font-size", 12)
        .attr("font-weight", 800)
        .text(d => d.id)
        .on("pointerenter", (event, d) => setActiveCanton(d.id, event))
        .on("pointerleave", () => setActiveCanton(null))
        .transition().duration(400)
        .attr("x", d => x(d.values.at(-1).date) + 8)
        .attr("y", d => y(d.values.at(-1).value));

    renderRankTimeline();
    update();
    startRace(false);
}

function getRankTimelineBuckets(mode) {
    if (mode === "1y") return 1;
    if (mode === "5y") return 5;
    if (mode === "10y") return 10;
    return 0;
}

function buildRankTimelineVotes(mode) {
    const bucketYears = getRankTimelineBuckets(mode);

    if (!bucketYears) {
        return votes.map(vote => ({
            key: vote.date,
            label: vote.dateLabel,
            cantons: (vote.cantons || []).map(canton => ({
                id: canton.id,
                label: canton.label,
                value: Number(canton.value)
            }))
        }));
    }

    if (!votes.length) return [];

    const firstYear = d3.min(votes, vote => vote.dateObj.getFullYear());
    const buckets = new Map();

    for (const vote of votes) {
        const year = vote.dateObj.getFullYear();
        const bucketIndex = Math.floor((year - firstYear) / bucketYears);
        const startYear = firstYear + bucketIndex * bucketYears;
        const endYear = startYear + bucketYears - 1;
        const bucketKey = `${startYear}-${endYear}`;

        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, {
                key: bucketKey,
                label: bucketYears === 1 ? `${startYear}` : `${startYear}-${endYear}`,
                byCanton: new Map()
            });
        }

        const bucket = buckets.get(bucketKey);
        for (const canton of (vote.cantons || [])) {
            const current = bucket.byCanton.get(canton.id) || { id: canton.id, label: canton.label, sum: 0, count: 0 };
            current.sum += Number(canton.value);
            current.count += 1;
            bucket.byCanton.set(canton.id, current);
        }
    }

    return Array.from(buckets.values()).map(bucket => ({
        key: bucket.key,
        label: bucket.label,
        cantons: Array.from(bucket.byCanton.values()).map(canton => ({
            id: canton.id,
            label: canton.label,
            value: canton.count > 0 ? canton.sum / canton.count : 0
        }))
    }));
}

function renderRankTimeline() {
    if (!rankTimelineSvg.node() || votes.length === 0) return;

    const aggregationMode = rankAggregationSelect?.value || "all";
    const timelineVotes = buildRankTimelineVotes(aggregationMode);
    if (!timelineVotes.length) return;

    const xStep = 56;
    const minWidth = 980;
    const dynamicPlotWidth = Math.max(0, (timelineVotes.length - 1) * xStep);
    const width = Math.max(minWidth, 64 + dynamicPlotWidth + 24);
    const height = 700;
    const margin = { top: 24, right: 24, bottom: 90, left: 64 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    rankTimelineSvg
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", width)
        .attr("height", height)
        .style("width", `${width}px`)
        .style("height", `${height}px`);

    const frames = timelineVotes.map(vote => {
        const ranked = (vote.cantons || [])
            .map(c => ({ ...c, value: Number(c.value) }))
            .sort((a, b) => d3.descending(a.value, b.value));

        return ranked.map((canton, index) => ({
            xKey: vote.key,
            rank: index + 1,
            id: canton.id,
            coat: coatOfArms[canton.id] || fallbackCoat
        }));
    });

    const points = frames.flat();
    const top3ByDate = new Map(
        timelineVotes.map((vote, i) => {
            const top3Ids = (frames[i] || []).slice(0, 3).map(d => d.id);
            return [vote.key, top3Ids];
        })
    );
    const maxRank = d3.max(points, d => d.rank) || 1;

    rankTimelineSvg.selectAll("*").remove();

    const gRank = rankTimelineSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xRank = d3.scalePoint()
        .domain(timelineVotes.map(v => v.key))
        .range([0, chartWidth])
        .padding(0.4);

    const yRank = d3.scaleLinear()
        .domain([1, maxRank + 1])
        .range([0, chartHeight]);

    const xTickValues = timelineVotes.map(v => v.key);
    const tickLabelByKey = new Map(timelineVotes.map(v => [v.key, v.label]));

    gRank.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yRank).ticks(maxRank).tickSize(-chartWidth).tickFormat(""));

    gRank.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(yRank).tickValues(d3.range(1, maxRank + 1)).tickFormat(d => `#${d}`));

    gRank.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xRank).tickValues(xTickValues).tickFormat(d => tickLabelByKey.get(d) || d))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.7em")
        .attr("dy", "0.1em")
        .attr("transform", "rotate(-55)");

    const pointsByCanton = Array.from(
        d3.group(points, d => d.id),
        ([id, values]) => ({
            id,
            values: values.sort((a, b) => d3.ascending(xTickValues.indexOf(a.xKey), xTickValues.indexOf(b.xKey)))
        })
    );

    const rankPath = d3.line()
        .x(d => xRank(d.xKey))
        .y(d => yRank(d.rank));

    gRank.append("g")
        .attr("class", "rank-progress-group")
        .selectAll("path.rank-progress-line")
        .data(pointsByCanton, d => d.id)
        .join("path")
        .attr("class", "rank-progress-line")
        .attr("data-canton-id", d => d.id)
        .attr("d", d => rankPath(d.values))
        .attr("stroke", d => color(d.id));

    gRank.selectAll("image.rank-mark")
        .data(points)
        .join("image")
        .attr("class", "rank-mark")
        .attr("href", d => d.coat)
        .attr("x", d => xRank(d.xKey) - 9)
        .attr("y", d => yRank(d.rank) - 9)
        .attr("width", 18)
        .attr("height", 18);

    const hoverLayer = gRank.append("rect")
        .attr("class", "rank-hover-layer")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("fill", "transparent")
        .attr("pointer-events", "all");

    const rankLines = gRank.selectAll("path.rank-progress-line");

    function updateTop3LinesForNearestHover(mouseX, mouseY) {
        let nearestKey = xTickValues[0];
        let bestDistance = Infinity;

        for (const tickKey of xTickValues) {
            const px = xRank(tickKey);
            const distance = Math.abs(px - mouseX);
            if (distance < bestDistance) {
                bestDistance = distance;
                nearestKey = tickKey;
            }
        }

        const activeTop3 = new Set(top3ByDate.get(nearestKey) || []);
        let nearestCantonId = null;
        let bestPointDistance = Infinity;

        for (const point of points) {
            const px = xRank(point.xKey);
            const py = yRank(point.rank);
            const distance = Math.hypot(px - mouseX, py - mouseY);
            if (distance < bestPointDistance) {
                bestPointDistance = distance;
                nearestCantonId = point.id;
            }
        }

        if (nearestCantonId) {
            activeTop3.add(nearestCantonId);
        }

        rankLines.classed("is-active", d => activeTop3.has(d.id));
    }

    hoverLayer
        .on("pointerenter", (event) => {
            const [mx, my] = d3.pointer(event, gRank.node());
            updateTop3LinesForNearestHover(mx, my);
        })
        .on("pointermove", (event) => {
            const [mx, my] = d3.pointer(event, gRank.node());
            updateTop3LinesForNearestHover(mx, my);
        })
        .on("pointerleave", () => {
            rankLines.classed("is-active", false);
        });
}

function updateSliderTrack() {
    const min = parseInt(fromSlider.min);
    const max = parseInt(fromSlider.max);
    const val1 = parseInt(fromSlider.value);
    const val2 = parseInt(toSlider.value);

    const percent1 = ((val1 - min) / (max - min)) * 100;
    const percent2 = ((val2 - min) / (max - min)) * 100;

    sliderTrackActive.style.left = Math.min(percent1, percent2) + "%";
    sliderTrackActive.style.width = Math.abs(percent2 - percent1) + "%";
}

let isRangeWindowDragging = false;
let dragStartX = 0;
let dragStartFromIndex = 0;

function shiftRangeWindowByPointer(clientX) {
    const min = Number(fromSlider.min);
    const max = Number(fromSlider.max);
    const totalSteps = max - min;
    const currentWindowSize = state.toIndex - state.fromIndex;
    const maxFrom = max - currentWindowSize;
    const containerRect = sliderContainer.getBoundingClientRect();

    if (totalSteps <= 0 || containerRect.width <= 0) return;

    const deltaX = clientX - dragStartX;
    const deltaSteps = Math.round((deltaX / containerRect.width) * totalSteps);
    const nextFrom = Math.min(Math.max(dragStartFromIndex + deltaSteps, min), maxFrom);
    const nextTo = nextFrom + currentWindowSize;

    if (nextFrom === state.fromIndex && nextTo === state.toIndex) return;

    state.fromIndex = nextFrom;
    state.toIndex = nextTo;
    fromSlider.value = state.fromIndex;
    toSlider.value = state.toIndex;
    updateSliderTrack();
    update();
}

sliderTrackActive.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    isRangeWindowDragging = true;
    dragStartX = event.clientX;
    dragStartFromIndex = state.fromIndex;
    sliderTrackActive.classList.add("is-dragging");
    if (sliderTrackActive.setPointerCapture) {
        sliderTrackActive.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
});

sliderTrackActive.addEventListener("pointermove", (event) => {
    if (!isRangeWindowDragging) return;
    shiftRangeWindowByPointer(event.clientX);
});

function endRangeWindowDrag(event) {
    if (!isRangeWindowDragging) return;
    isRangeWindowDragging = false;
    sliderTrackActive.classList.remove("is-dragging");
    if (event && sliderTrackActive.releasePointerCapture) {
        try {
            sliderTrackActive.releasePointerCapture(event.pointerId);
        } catch (e) {
            // Ignore if pointer was already released.
        }
    }
}

sliderTrackActive.addEventListener("pointerup", endRangeWindowDrag);
sliderTrackActive.addEventListener("pointercancel", endRangeWindowDrag);

// -------------------------------------------------------------------------
// 6) Interaktion
// -------------------------------------------------------------------------
fromSlider.addEventListener("input", () => {
    state.fromIndex = Number(fromSlider.value);
    if (state.fromIndex > state.toIndex) {
        state.toIndex = state.fromIndex;
        toSlider.value = state.toIndex;
    }
    updateSliderTrack();
    update();
});

toSlider.addEventListener("input", () => {
    state.toIndex = Number(toSlider.value);
    if (state.toIndex < state.fromIndex) {
        state.fromIndex = state.toIndex;
        fromSlider.value = state.fromIndex;
    }
    updateSliderTrack();
    update();
});

rankingMode.addEventListener("change", () => {
    state.rankingMode = rankingMode.value;
    update();
});

if (rankAggregationSelect) {
    rankAggregationSelect.addEventListener("change", () => {
        renderRankTimeline();
    });
}

resetButton.addEventListener("click", () => {
    selectedCompareCantons.clear();
    state = { fromIndex: 0, toIndex: votes.length - 1, rankingMode: rankingMode.value };
    fromSlider.value = state.fromIndex;
    toSlider.value = state.toIndex;
    updateSliderTrack();
    update();
});

// -------------------------------------------------------------------------
// 7) Bar Chart Race
// -------------------------------------------------------------------------
let raceInterval = null;
let raceIsPaused = false;
let raceSpeed = 300;
let raceK = 0;
let raceKeyframes = [];
let globalTogglePause = null;
let globalChangeSpeed = null;
const n = 26; // Alle 26 Kantone anzeigen

// Individuelle Geschwindigkeiten pro Abstimmung (in ms)
// Falls für einen Index kein Wert vorhanden ist, wird raceSpeed verwendet.
const customRaceSpeeds = {
    0: 1000, 1: 2000, 3: 2000, 4: 2000, 5: 2000, 6: 2000,
    7: 2000, 8: 2000, 9: 2000, 10: 2000, 11: 2000, 12: 2000,
    13: 2000, 14: 1500, 15: 1500, 16: 1500, 17: 1500, 18: 1500,
    19: 1500, 20: 1500
};

if (replayRaceButton) {
    replayRaceButton.addEventListener("click", () => {
        syncSportAudio('stop');
        startRace();
        syncSportAudio('play');
    });
}

if (pauseRaceButton) {
    pauseRaceButton.addEventListener("click", () => {
        if (globalTogglePause) globalTogglePause();
    });
}

if (raceSpeedSelect) {
    raceSpeedSelect.addEventListener("change", () => {
        if (globalChangeSpeed) globalChangeSpeed(Number(raceSpeedSelect.value));
    });
}

function stopRace() {
    syncSportAudio('stop');
    if (raceInterval) {
        raceInterval.stop();
        raceInterval = null;
    }
}

async function startRace(startImmediately = true) {
    stopRace();
    raceK = 0;
    raceIsPaused = !startImmediately;
    if (pauseRaceButton) {
        pauseRaceButton.textContent = startImmediately ? "⏸ Pause" : "▶ Starten";
    }
    if (raceSpeedSelect) {
        raceSpeed = Number(raceSpeedSelect.value);
    }

    const raceSvg = d3.select("#raceChart");
    const raceWidth = 980;
    const raceHeight = 600;
    const raceMargin = { top: 20, right: 120, bottom: 10, left: 240 };

    const xRace = d3.scaleLinear().domain([0, 100]).range([raceMargin.left, raceWidth - raceMargin.right]);
    const yRace = d3.scaleBand()
        .domain(d3.range(n + 1))
        .rangeRound([raceMargin.top, raceMargin.top + (raceHeight - raceMargin.top - raceMargin.bottom) * (n + 1) / n])
        .padding(0.3);

    const formatNumber = d3.format(",.1f");

    // Bereite Schlüsselbilder vor (Keyframes)
    raceKeyframes = [];
    const windowSize = 10; // Durchschnitt über die letzten 10 Abstimmungen (nur normaler Modus)

    let raceVotes = votes;
    if (sportModeToggle && sportModeToggle.checked) {
        const startDate = new Date("2002-03-03");
        const endDate = new Date("2008-02-24");
        raceVotes = votes.filter(v => v.dateObj >= startDate && v.dateObj <= endDate);
    }

    for (let i = 0; i < raceVotes.length; i++) {
        const currentVote = raceVotes[i];
        let frameCantons;

        if (sportModeToggle && sportModeToggle.checked) {
            frameCantons = cantonIds.map(cid => {
                const canton = currentVote.cantons.find(c => c.id === cid);
                return {
                    id: cid,
                    label: canton?.label || cid,
                    value: canton ? Number(canton.value) : 0
                };
            });
        } else {
            const currentVoteDate = currentVote.dateObj;
            // Finde Index in den Original-Votes für das Fenster (gleitender Durchschnitt)
            const originalIndex = votes.findIndex(v => v.dateObj.getTime() === currentVoteDate.getTime());

            const start = Math.max(0, originalIndex - windowSize + 1);
            const windowVotes = votes.slice(start, originalIndex + 1);

            // Berechne Durchschnitt für jeden Kanton in diesem Fenster
            frameCantons = cantonIds.map(cid => {
                const values = windowVotes.map(v => v.cantons.find(c => c.id === cid)?.value).filter(v => v !== undefined);
                const avg = values.length > 0 ? d3.mean(values) : 0;
                const label = windowVotes[windowVotes.length - 1].cantons.find(c => c.id === cid)?.label || cid;
                return { id: cid, label: label, value: avg };
            });
        }

        const sortedCantons = frameCantons.sort((a, b) => d3.descending(a.value, b.value));
        raceKeyframes.push([currentVote.dateObj, sortedCantons]);
    }

    function runRaceInterval() {
        if (raceInterval) {
            raceInterval.stop();
        }

        if (raceK === 0 && !raceIsPaused) {
            syncSportAudio('stop');
            syncSportAudio('play');
        }

        const tick = () => {
            if (raceIsPaused) return;

            // Bestimme Geschwindigkeit für dieses Frame
            const currentSpeed = customRaceSpeeds[raceK] || raceSpeed;
            const transitionDuration = Math.max(70, currentSpeed - 40);

            renderFrame(raceK, transitionDuration);
            raceK++;

            if (raceK < raceKeyframes.length) {
                // Plane den nächsten Tick mit der (potenziell neuen) Geschwindigkeit
                const nextSpeed = customRaceSpeeds[raceK] || raceSpeed;
                raceInterval = d3.timeout(tick, nextSpeed);
            } else {
                raceInterval = null;
                // Bei normalem Rennende Audio weiterlaufen lassen.
                // Gestoppt wird nur bei Pause oder Neustart.
                if (pauseRaceButton) {
                    pauseRaceButton.textContent = "↺ Wiederholen";
                }
            }
        };

        // Starte den ersten Tick
        const initialSpeed = customRaceSpeeds[raceK] || raceSpeed;
        raceInterval = d3.timeout(tick, initialSpeed);
    }

    globalTogglePause = () => {
        if (!raceInterval && raceK >= raceKeyframes.length) {
            syncSportAudio('stop');
            startRace(true);
            syncSportAudio('play');
            return;
        }
        if (!raceInterval && raceK === 0 && raceIsPaused) {
            raceIsPaused = false;
            if (pauseRaceButton) pauseRaceButton.textContent = "⏸ Pause";
            syncSportAudio('play');
            runRaceInterval();
            return;
        }
        raceIsPaused = !raceIsPaused;
        if (raceIsPaused) {
            if (pauseRaceButton) pauseRaceButton.textContent = "▶ Fortsetzen";
            syncSportAudio('pause');
            if (raceInterval) {
                raceInterval.stop();
                raceInterval = null;
            }
        } else {
            if (pauseRaceButton) pauseRaceButton.textContent = "⏸ Pause";
            syncSportAudio('play');
            // runRaceInterval() setzt raceInterval neu und führt den nächsten Tick aus
            runRaceInterval();
        }
    };

    globalChangeSpeed = (newSpeed) => {
        raceSpeed = newSpeed;
        if (raceInterval && !raceIsPaused) {
            runRaceInterval();
        }
    };

    // Initiales Zeichnen
    function renderFrame(index, transitionDuration) {
        const [date, frameData] = raceKeyframes[index];
        raceDateLabel.textContent = formatDate(date);

        const displayedData = frameData.slice(0, n);

        // Update top leader card in real-time with the race
        const currentTop = displayedData[0];
        if (currentTop) {
            topCanton.textContent = currentTop.id;
            topCantonSub.textContent = `${currentTop.label}: ${formatValue(currentTop.value)}%`;
        }

        // Draw static rank numbers on the far left
        raceSvg.selectAll("text.race-rank-static")
            .data(d3.range(n))
            .join("text")
            .attr("class", "race-rank-static")
            .attr("text-anchor", "start")
            .attr("x", 20)
            .attr("y", i => yRace(i) + yRace.bandwidth() / 2)
            .attr("dy", "0.35em")
            .style("font-family", "inherit")
            .style("font-weight", i => i < 3 ? "900" : "700")
            .style("font-size", i => i === 0 ? "16px" : i < 3 ? "14px" : "13px")
            .style("fill", i => i === 0 ? "#b58900" : i === 1 ? "#64748b" : i === 2 ? "#a16207" : "var(--muted)")
            .text(i => `#${i + 1}`);

        raceSvg.selectAll("rect.bar")
            .data(displayedData, d => d.id)
            .join(
                enter => enter.append("rect")
                    .attr("class", "bar")
                    .attr("fill", d => color(d.id))
                    .attr("x", xRace(0))
                    .attr("y", d => yRace(n))
                    .attr("height", yRace.bandwidth())
                    .attr("width", 0),
                update => update,
                exit => exit.transition().duration(transitionDuration).attr("width", 0).attr("y", yRace(n)).remove()
            )
            .transition().duration(transitionDuration).ease(d3.easeLinear)
            .attr("y", (d, i) => yRace(i))
            .attr("width", d => xRace(d.value) - xRace(0))
            .selection()
            .classed("podium-1", (d, i) => i === 0)
            .classed("podium-2", (d, i) => i === 1)
            .classed("podium-3", (d, i) => i === 2);

        raceSvg.selectAll("text.bar-label")
            .data(displayedData, d => d.id)
            .join(
                enter => enter.append("text")
                    .attr("class", "bar-label")
                    .attr("text-anchor", "end")
                    .attr("x", xRace(0) - 10)
                    .attr("y", d => yRace(n) + yRace.bandwidth() / 2)
                    .attr("dy", "0.35em")
                    .text(d => d.label),
                update => update,
                exit => exit.transition().duration(transitionDuration).attr("y", yRace(n)).remove()
            )
            .transition().duration(transitionDuration).ease(d3.easeLinear)
            .attr("y", (d, i) => yRace(i) + yRace.bandwidth() / 2)
            .text(d => d.label)
            .selection()
            .classed("podium-1", (d, i) => i === 0)
            .classed("podium-2", (d, i) => i === 1)
            .classed("podium-3", (d, i) => i === 2);

        raceSvg.selectAll("text.bar-value")
            .data(displayedData, d => d.id)
            .join(
                enter => enter.append("text")
                    .attr("class", "bar-value")
                    .attr("x", d => xRace(0) + 6)
                    .attr("y", d => yRace(n) + yRace.bandwidth() / 2)
                    .attr("dy", "0.35em")
                    .text(d => formatNumber(d.value) + "%"),
                update => update,
                exit => exit.transition().duration(transitionDuration).attr("y", yRace(n)).remove()
            )
            .transition().duration(transitionDuration).ease(d3.easeLinear)
            .attr("x", d => xRace(d.value) + 6)
            .attr("y", (d, i) => yRace(i) + yRace.bandwidth() / 2)
            .textTween(function(d) {
                const i = d3.interpolateNumber(parseFloat(this.textContent) || 0, d.value);
                return t => formatNumber(i(t)) + "%";
            })
            .selection()
            .classed("podium-1", (d, i) => i === 0)
            .classed("podium-2", (d, i) => i === 1)
            .classed("podium-3", (d, i) => i === 2);
    }

    if (startImmediately) {
        runRaceInterval();
    } else {
        renderFrame(0, 0);
    }
}

function getSelectedVotes() {
    return votes.slice(state.fromIndex, state.toIndex + 1);
}

function getSelectedDateRange() {
    const selected = getSelectedVotes();
    return {
        start: selected[0].dateObj,
        end: selected.at(-1).dateObj,
        startLabel: selected[0].dateLabel,
        endLabel: selected.at(-1).dateLabel,
        voteIds: new Set(selected.map(d => d.id))
    };
}

function getRanking() {
    const { voteIds } = getSelectedDateRange();
    const selectedData = data.filter(d => voteIds.has(d.voteId));
    const grouped = Array.from(d3.group(selectedData, d => d.id), ([id, values]) => {
        values = values.sort((a, b) => d3.ascending(a.date, b.date));
        const first = values[0];
        const last = values.at(-1);
        const avg = d3.mean(values, d => d.value);
        const change = last.value - first.value;

        let score;
        if (state.rankingMode === "end") score = last.value;
        else if (state.rankingMode === "change") score = change;
        else score = avg;

        return {
            id,
            label: first.label,
            coat: first.coat,
            score,
            avg,
            end: last.value,
            change,
            first: first.value,
            last: last.value,
            count: values.length
        };
    });

    return grouped.sort((a, b) => d3.descending(a.score, b.score));
}

function getModeText() {
    if (state.rankingMode === "end") return "Endwert";
    if (state.rankingMode === "change") return "Veränderung";
    return "Durchschnitt";
}

function update() {
    const { start, end, startLabel, endLabel } = getSelectedDateRange();
    const ranking = getRanking();
    const top = ranking[0];

    rangeLabel.textContent = `${startLabel} – ${endLabel}`;
    rankingDescription.textContent = `${getModeText()} im Zeitraum ${startLabel} bis ${endLabel}`;

    if (top) {
        topCanton.textContent = top.id;
        topCantonSub.textContent = `${top.label}: ${formatValue(top.score)}%`;
    }

    // Chart Update: X-Scale anpassen
    x.domain([start, end]);

    g.select(".x-axis")
        .transition().duration(220)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%m.%Y")));

    seriesGroup.selectAll("path.line")
        .transition().duration(220)
        .attr("d", d => line(d.values));

    seriesGroup.selectAll("path.hit-line")
        .transition().duration(220)
        .attr("d", d => line(d.values));

    labelsGroup.selectAll("text")
        .transition().duration(220)
        .attr("x", d => x(d.values.at(-1).date) + 8)
        .attr("y", d => y(d.values.at(-1).value))
        .style("opacity", d => {
            const lastDate = d.values.at(-1).date;
            return (lastDate >= start && lastDate <= end) ? 1 : 0;
        });

    syncCantonFilterSelection();
    updateSliderTrack();
    renderRanking(ranking);
    updateActiveStyles();
}

function renderRanking(ranking) {
    const items = rankingList
        .selectAll(".rank-item")
        .data(ranking, d => d.id)
        .join(
            enter => {
                const item = enter.append("div")
                    .attr("class", "rank-item")
                    .on("pointerenter", (event, d) => setActiveCanton(d.id, event))
                    .on("pointerleave", () => setActiveCanton(null));

                const checkboxWrap = item.append("div").attr("class", "rank-checkbox-wrap");
                checkboxWrap.append("input")
                    .attr("type", "checkbox")
                    .attr("class", "compare-checkbox")
                    .attr("title", "Kanton vergleichen")
                    .on("click", (event, d) => {
                        event.stopPropagation();
                        toggleCantonSelection(d.id);
                    });

                item.append("div").attr("class", "rank-number");
                item.append("img").attr("class", "coat").attr("alt", "");

                const name = item.append("div");
                name.append("div").attr("class", "canton-name");
                name.append("div").attr("class", "canton-code");

                item.append("div").attr("class", "rank-value");
                return item;
            },
            update => update,
            exit => exit.remove()
        );

    items
        .transition()
        .duration(280)
        .style("opacity", 1);

    items.select(".rank-number").text((d, i) => `#${i + 1}`);
    items.select("img").attr("src", d => d.coat).attr("alt", d => `${d.label} Wappen`);
    items.select(".compare-checkbox").property("checked", d => selectedCompareCantons.has(d.id));
    items.select(".canton-name").text(d => d.label);
    items.select(".canton-code").text(d => d.id);
    items.select(".rank-value").text(d => {
        const prefix = state.rankingMode === "change" && d.score > 0 ? "+" : "";
        return `${prefix}${formatValue(d.score)}%`;
    });
}

function setActiveCanton(id, event = null) {
    activeCanton = id;
    updateActiveStyles();

    if (!id) {
        tooltip.classed("visible", false);
        lineHoverDateBox.classList.remove("visible");
        g.selectAll("circle.hover-dot").remove();
        return;
    }

    const cantonSeries = series.find(d => d.id === id);
    if (event && cantonSeries) showTooltip(event, cantonSeries);
}

function updateActiveStyles() {
    const hasSelection = selectedCompareCantons.size > 0;

    seriesGroup.selectAll("path.line")
        .style("display", d => !hasSelection || selectedCompareCantons.has(d.id) ? "block" : "none")
        .classed("is-muted", d => activeCanton && d.id !== activeCanton)
        .classed("is-active", d => activeCanton && d.id === activeCanton);

    seriesGroup.selectAll("path.hit-line")
        .style("display", d => !hasSelection || selectedCompareCantons.has(d.id) ? "block" : "none");

    seriesGroup.selectAll("path.hit-line")
        .filter(d => d.id === activeCanton)
        .raise();

    seriesGroup.selectAll("path.line")
        .filter(d => d.id === activeCanton)
        .raise();

    labelsGroup.selectAll("text")
        .style("display", d => !hasSelection || selectedCompareCantons.has(d.id) ? "block" : "none")
        .style("opacity", d => !activeCanton || d.id === activeCanton ? 1 : 0.2)
        .style("font-size", d => activeCanton === d.id ? "15px" : "12px")
        .filter(d => d.id === activeCanton)
        .raise();

    rankingList.selectAll(".rank-item")
        .classed("is-active", d => activeCanton && d.id === activeCanton);
}

function showTooltip(event, cantonSeries) {
    const [mx, my] = d3.pointer(event, lineChartWrap);
    const mouseXDate = x.invert(d3.pointer(event, g.node())[0]);

    // Finde den Datenpunkt, der dem Mauszeiger am nächsten liegt
    const bisectDate = d3.bisector(d => d.date).left;
    const idx = bisectDate(cantonSeries.values, mouseXDate, 1);
    const d0 = cantonSeries.values[idx - 1];
    const d1 = cantonSeries.values[idx];
    let closestPoint = d0;
    if (d1 && (mouseXDate - d0.date > d1.date - mouseXDate)) {
        closestPoint = d1;
    }

    if (closestPoint && lineChartWrap) {
        const hoverX = x(closestPoint.date) + margin.left;
        const sameDateItems = cantonSeries.values
            .filter(point => +point.date === +closestPoint.date)
            .map(point => ({
                title: point.title || ("Votation: " + formatDate(point.date)),
                accepted: point.accepted
            }));

        const uniqueItems = [];
        const seen = new Set();
        for (const item of sameDateItems) {
            const key = `${item.title}||${String(item.accepted ?? "")}`;
            if (seen.has(key)) continue;
            seen.add(key);
            uniqueItems.push(item);
        }

        lineHoverDateBox.innerHTML = uniqueItems
            .map((item, index) => `${index + 1}. ${getAcceptedBadge(item.accepted)} ${escapeHtml(item.title)}`)
            .join("<br>");
        lineHoverDateBox.style.left = `${hoverX}px`;
        lineHoverDateBox.style.top = `${my}px`;
        lineHoverDateBox.classList.add("visible");

        // Hover-Punkt (Kreis) auf der Linie anzeigen
        let hoverDot = g.selectAll("circle.hover-dot").data([closestPoint]);
        hoverDot.join("circle")
            .attr("class", "hover-dot dot")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.value))
            .attr("r", 6)
            .attr("fill", color(cantonSeries.id))
            .attr("stroke", "var(--border)")
            .attr("stroke-width", 2)
            .style("display", "block");

        // Detaillierten Tooltip anzeigen
        const ranking = getRanking();
        const rank = ranking.findIndex(d => d.id === cantonSeries.id) + 1;
        const entry = ranking.find(d => d.id === cantonSeries.id);

        if (entry) {
            tooltip
                .classed("visible", true)
                .style("left", `${mx}px`)
                .style("top", `${my}px`)
                .html(`
                  <div class="tooltip-title">
                    <img src="${entry.coat}" alt="" />
                    <span>#${rank} ${entry.label} (${entry.id})</span>
                  </div>
                  <div>Wert: <strong>${formatValue(closestPoint.value)}%</strong></div>
                  <div>Datum: ${formatDate(closestPoint.date)}</div>
                `);
        }
    }
}

// update wird in init() aufgerufen
