
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
let state = {
    fromIndex: 0,
    toIndex: 0,
    rankingMode: "avg"
};

const parseDate = d3.timeParse("%Y-%m-%d");
const formatDate = d3.timeFormat("%d.%m.%Y");
const formatValue = d3.format(".1f");

// DOM + D3 Globals
const svg = d3.select("#chart");
const rankTimelineSvg = d3.select("#rankTimelineChart");
const tooltip = d3.select("#tooltip");
const rankingList = d3.select("#rankingList");
const lineChartWrap = document.querySelector("#chart")?.closest(".chart-wrap");
const lineHoverDateBox = document.createElement("div");
lineHoverDateBox.className = "line-hover-date-box";
if (lineChartWrap) {
    lineChartWrap.appendChild(lineHoverDateBox);
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
    const endpoint = 'https://ld.admin.ch/query';
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
    return transformSparqlData(result);
}

function transformSparqlData(sparqlResult) {
    const bindings = sparqlResult.results.bindings;
    const groupedByDate = {};
    bindings.forEach(b => {
        if (!b.date || !b.region || !b.participation) return;
        const date = b.date.value;
        const regionUri = b.region.value;
        const participation = parseFloat(b.participation.value);
        if (!groupedByDate[date]) {
            groupedByDate[date] = { id: `${date}-vote`, date: date, title: `Popular Vote on ${date}`, cantons: [] };
        }
        const cantonInfo = cantonMap[regionUri] || { id: regionUri.split('/').pop(), label: regionUri.split('/').pop() };
        groupedByDate[date].cantons.push({ id: cantonInfo.id, label: cantonInfo.label, value: participation });
    });
    return Object.values(groupedByDate).sort((a, b) => a.date.localeCompare(b.date));
}

fetchLiveResults().then(liveData => {
    init(liveData);
}).catch(err => {
    console.error('Failed to fetch live data, falling back to data.json', err);
    d3.json("data.json").then(rawData => {
        init(rawData);
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
            id: canton.id,
            label: canton.label,
            value: Number(canton.value),
            coat: coatOfArms[canton.id] ?? fallbackCoat
        }));
    }).sort((a, b) => d3.ascending(a.date, b.date));

    votes = rawData
        .map((d, index) => ({ ...d, index, dateObj: parseDate(d.date), dateLabel: formatDate(parseDate(d.date)) }))
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

if (replayRaceButton) {
    replayRaceButton.addEventListener("click", () => {
        startRace();
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

    // Bereite Schlüsselbilder vor (Keyframes) mit gleitendem Durchschnitt
    raceKeyframes = [];
    const windowSize = 10; // Durchschnitt über die letzten 10 Abstimmungen

    for (let i = 0; i < votes.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const windowVotes = votes.slice(start, i + 1);
        
        // Berechne Durchschnitt für jeden Kanton in diesem Fenster
        const cantonAverages = cantonIds.map(cid => {
            const values = windowVotes.map(v => v.cantons.find(c => c.id === cid)?.value).filter(v => v !== undefined);
            const avg = values.length > 0 ? d3.mean(values) : 0;
            const label = windowVotes[windowVotes.length - 1].cantons.find(c => c.id === cid)?.label || cid;
            return { id: cid, label: label, value: avg };
        });

        const sortedCantons = cantonAverages.sort((a, b) => d3.descending(a.value, b.value));
        raceKeyframes.push([votes[i].dateObj, sortedCantons]);
    }

    function runRaceInterval() {
        if (raceInterval) {
            raceInterval.stop();
        }
        const transitionDuration = Math.max(70, raceSpeed - 40);

        raceInterval = d3.interval(() => {
            if (raceIsPaused) return;
            renderFrame(raceK, transitionDuration);
            raceK++;
            if (raceK >= raceKeyframes.length) {
                raceInterval.stop();
                raceInterval = null;
                if (pauseRaceButton) {
                    pauseRaceButton.textContent = "↺ Wiederholen";
                }
            }
        }, raceSpeed);
    }

    globalTogglePause = () => {
        if (!raceInterval && raceK >= raceKeyframes.length) {
            startRace(true);
            return;
        }
        if (!raceInterval && raceK === 0 && raceIsPaused) {
            raceIsPaused = false;
            if (pauseRaceButton) pauseRaceButton.textContent = "⏸ Pause";
            runRaceInterval();
            return;
        }
        raceIsPaused = !raceIsPaused;
        if (raceIsPaused) {
            if (pauseRaceButton) pauseRaceButton.textContent = "▶ Fortsetzen";
            if (raceInterval) {
                raceInterval.stop();
                raceInterval = null;
            }
        } else {
            if (pauseRaceButton) pauseRaceButton.textContent = "⏸ Pause";
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
        return;
    }

    const cantonSeries = series.find(d => d.id === id);
    if (event && cantonSeries) showTooltip(event, cantonSeries);
}

function updateActiveStyles() {
    seriesGroup.selectAll("path.line")
        .classed("is-muted", d => activeCanton && d.id !== activeCanton)
        .classed("is-active", d => activeCanton && d.id === activeCanton);

    seriesGroup.selectAll("path.hit-line")
        .filter(d => d.id === activeCanton)
        .raise();

    seriesGroup.selectAll("path.line")
        .filter(d => d.id === activeCanton)
        .raise();

    labelsGroup.selectAll("text")
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
        lineHoverDateBox.textContent = `Votation: ${formatDate(closestPoint.date)}`;
        lineHoverDateBox.style.left = `${hoverX}px`;
        lineHoverDateBox.style.top = `${my}px`;
        lineHoverDateBox.classList.add("visible");
    }

        tooltip.classed("visible", false);
}

// update wird in init() aufgerufen