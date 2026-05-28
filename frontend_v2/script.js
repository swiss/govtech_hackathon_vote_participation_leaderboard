
// -------------------------------------------------------------------------
// 1) Daten laden
// -------------------------------------------------------------------------
const coatOfArms = {
    ZH: "assets/cantons/zh.svg",
    BE: "assets/cantons/be.svg",
    LU: "assets/cantons/lu.svg",
    UR: "assets/cantons/ur.svg",
    SZ: "assets/cantons/sz.svg"
    // AG: "assets/cantons/ag.svg",
    // ... alle 26 Kantone ergänzen
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
const tooltip = d3.select("#tooltip");
const rankingList = d3.select("#rankingList");

const fromSlider = document.querySelector("#fromSlider");
const toSlider = document.querySelector("#toSlider");
const rangeLabel = document.querySelector("#rangeLabel");
const rankingMode = document.querySelector("#rankingMode");
const resetButton = document.querySelector("#resetButton");
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
    .attr("fill", "#94a3b8")
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .text("Wert");

const rangeWindow = g.append("rect")
    .attr("class", "range-window")
    .attr("y", 0)
    .attr("height", innerHeight)
    .attr("rx", 10);

const seriesGroup = g.append("g").attr("class", "series-group");
const labelsGroup = g.append("g").attr("class", "labels-group");

d3.json("data.json").then(rawData => {
    init(rawData);
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
            FederalCouncillor: Number(canton.FederalCouncillor ?? 0),
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
            FederalCouncillor: values.some(d => d.FederalCouncillor === 1) ? 1 : 0,
            coat: values[0]?.coat ?? fallbackCoat,
            values: values.sort((a, b) => d3.ascending(a.date, b.date))
        })
    );

    // -------------------------------------------------------------------------
    // 3) UI initialisieren
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
        .on("pointermove", (event, d) => showTooltip(event, d))
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
        .on("pointermove", (event, d) => showTooltip(event, d))
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

    update();
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

resetButton.addEventListener("click", () => {
    state = { fromIndex: 0, toIndex: votes.length - 1, rankingMode: rankingMode.value };
    fromSlider.value = state.fromIndex;
    toSlider.value = state.toIndex;
    updateSliderTrack();
    update();
});

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
            FederalCouncillor: values.some(d => d.FederalCouncillor === 1) ? 1 : 0,
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
        topCantonSub.textContent = `${top.label}: ${formatValue(top.score)}`;
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
                name.append("div").attr("class", "badge").text("Bundesrat/-rätin");

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
    items.select(".badge").style("display", d => d.FederalCouncillor ? "inline-flex" : "none");
    items.select(".rank-value").text(d => {
        const prefix = state.rankingMode === "change" && d.score > 0 ? "+" : "";
        return `${prefix}${formatValue(d.score)}`;
    });
}

function setActiveCanton(id, event = null) {
    activeCanton = id;
    updateActiveStyles();

    if (!id) {
        tooltip.classed("visible", false);
        return;
    }

    const cantonSeries = series.find(d => d.id === id);
    if (event && cantonSeries) showTooltip(event, cantonSeries);
}

function updateActiveStyles() {
    seriesGroup.selectAll("path.line")
        .classed("is-muted", d => activeCanton && d.id !== activeCanton)
        .classed("is-active", d => activeCanton && d.id === activeCanton);

    labelsGroup.selectAll("text")
        .style("opacity", d => !activeCanton || d.id === activeCanton ? 1 : 0.2)
        .style("font-size", d => activeCanton === d.id ? "15px" : "12px");

    rankingList.selectAll(".rank-item")
        .classed("is-active", d => activeCanton && d.id === activeCanton);
}

function showTooltip(event, cantonSeries) {
    const ranking = getRanking();
    const rank = ranking.findIndex(d => d.id === cantonSeries.id) + 1;
    const entry = ranking.find(d => d.id === cantonSeries.id);
    if (!entry) return;

    const [mx, my] = d3.pointer(event, document.querySelector(".chart-wrap"));

    tooltip
        .classed("visible", true)
        .style("left", `${mx}px`)
        .style("top", `${my}px`)
        .html(`
          <div class="tooltip-title">
            <img src="${entry.coat}" alt="" />
            <span>#${rank} ${entry.label} (${entry.id})</span>
          </div>
          <div>${getModeText()}: <strong>${formatValue(entry.score)}</strong></div>
          <div>Start: ${formatValue(entry.first)} · Ende: ${formatValue(entry.last)}</div>
          <div>Veränderung: <strong>${entry.change >= 0 ? "+" : ""}${formatValue(entry.change)}</strong></div>
        `);
}

// update wird in init() aufgerufen