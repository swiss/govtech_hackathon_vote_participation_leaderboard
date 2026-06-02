import {stateManager} from '../services/state-manager.js';
import {CHART_CONFIG} from '../constants.js';
import {escapeHtml, formatDate, formatValue, getAcceptedBadge} from '../utils/formatters.js';

export class LineChart {
    constructor(selector) {
        this.svg = d3.select(selector);
        this.wrap = this.svg.node()?.closest(".chart-wrap");
        this.setup();

        stateManager.addEventListener("dataLoaded", () => this.init());
        stateManager.addEventListener("stateChanged", () => this.update());
        stateManager.addEventListener("activeCantonChanged", (e) => this.updateActiveStyles(e.detail.id));
    }

    setup() {
        const {margin, width, height} = CHART_CONFIG;
        this.innerWidth = width - margin.left - margin.right;
        this.innerHeight = height - margin.top - margin.bottom;

        this.g = this.svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Definiere Clip-Path, um Überlauf zu verhindern
        this.svg.append("defs").append("clipPath")
            .attr("id", "chart-clip")
            .append("rect")
            .attr("width", this.innerWidth)
            .attr("height", this.innerHeight);

        this.x = d3.scaleTime().range([0, this.innerWidth]);
        this.y = d3.scaleLinear().range([this.innerHeight, 0]);
        this.color = d3.scaleOrdinal().range(d3.schemeTableau10.concat(d3.schemeSet3));

        this.line = d3.line()
            .defined(d => Number.isFinite(d.value))
            .x(d => this.x(d.date))
            .y(d => this.y(d.value))
            .curve(d3.curveMonotoneX);

        this.g.append("g").attr("class", "grid");
        this.g.append("g").attr("class", "axis y-axis");
        this.g.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${this.innerHeight})`);

        this.seriesGroup = this.g.append("g")
            .attr("class", "series-group")
            .attr("clip-path", "url(#chart-clip)");

        this.tooltip = d3.select("#tooltip");
        this.lineHoverDateBox = document.querySelector(".line-hover-date-box");
        if (!this.lineHoverDateBox && this.wrap) {
            this.lineHoverDateBox = document.createElement("div");
            this.lineHoverDateBox.className = "line-hover-date-box";
            this.wrap.appendChild(this.lineHoverDateBox);
        }
    }

    init() {
        const {data, series, cantonIds} = stateManager;
        this.x.domain(d3.extent(data, d => d.date));
        this.y.domain(d3.extent(data, d => d.value)).nice();
        this.color.domain(cantonIds);

        this.g.select(".grid").call(d3.axisLeft(this.y).ticks(6).tickSize(-this.innerWidth).tickFormat(""));
        this.g.select(".y-axis").call(d3.axisLeft(this.y).ticks(6).tickFormat(d => `${d}`));

        this.update();
    }

    update() {
        const {series, state} = stateManager;
        const selectedVotes = stateManager.getSelectedVotes();
        const start = selectedVotes[0].dateObj;
        const end = selectedVotes.at(-1).dateObj;

        this.x.domain([start, end]);

        this.g.select(".x-axis")
            .transition().duration(220)
            .call(d3.axisBottom(this.x).ticks(6).tickFormat(d3.timeFormat("%m.%Y")));

        this.seriesGroup.selectAll("path.line")
            .data(series, d => d.id)
            .join("path")
            .attr("class", "line")
            .attr("stroke", d => this.color(d.id))
            .on("pointermove", (event, d) => this.handlePointerMove(event, d))
            .on("pointerleave", () => this.handlePointerLeave())
            .transition().duration(220)
            .attr("d", d => this.line(d.values));

        this.seriesGroup.selectAll("path.hit-line")
            .data(series, d => d.id)
            .join("path")
            .attr("class", "hit-line")
            .attr("fill", "none")
            .attr("stroke", "transparent")
            .attr("stroke-width", 16)
            .attr("pointer-events", "stroke")
            .on("pointermove", (event, d) => this.handlePointerMove(event, d))
            .on("pointerleave", () => this.handlePointerLeave())
            .transition().duration(220)
            .attr("d", d => this.line(d.values));

        this.updateActiveStyles(stateManager.activeCanton);
    }

    handlePointerMove(event, cantonSeries) {
        stateManager.setActiveCanton(cantonSeries.id);
        this.showTooltip(event, cantonSeries);
    }

    handlePointerLeave() {
        stateManager.setActiveCanton(null);
        this.tooltip.classed("visible", false);
        if (this.lineHoverDateBox) this.lineHoverDateBox.classList.remove("visible");
        this.g.selectAll("circle.hover-dot").remove();
    }

    showTooltip(event, cantonSeries) {
        const [mx, my] = d3.pointer(event, this.wrap);
        const mouseXDate = this.x.invert(d3.pointer(event, this.g.node())[0]);

        const bisectDate = d3.bisector(d => d.date).left;
        const idx = bisectDate(cantonSeries.values, mouseXDate, 1);
        const d0 = cantonSeries.values[idx - 1];
        const d1 = cantonSeries.values[idx];
        let closestPoint = d0;
        if (d1 && (mouseXDate - d0.date > d1.date - mouseXDate)) {
            closestPoint = d1;
        }

        if (closestPoint && this.wrap) {
            const hoverX = this.x(closestPoint.date) + CHART_CONFIG.margin.left;

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

            this.lineHoverDateBox.innerHTML = uniqueItems
                .map((item) => `${escapeHtml(item.title)} (${getAcceptedBadge(item.accepted)} ${item.accepted === 1 || item.accepted === true || item.accepted === "1" || item.accepted === "true" ? "angenommen" : "abgelehnt"})`)
                .join("<br><br>");
            this.lineHoverDateBox.classList.add("visible");
            this.lineHoverDateBox.style.left = `${hoverX}px`;
            this.lineHoverDateBox.style.top = `${my}px`;

            this.renderHoverDot(closestPoint, cantonSeries);
            this.renderDetailedTooltip(closestPoint, cantonSeries, mx, my);
        }
    }

    renderHoverDot(closestPoint, cantonSeries) {
        let hoverDot = this.g.selectAll("circle.hover-dot").data([closestPoint]);
        hoverDot.join("circle")
            .attr("class", "hover-dot dot")
            .attr("cx", d => this.x(d.date))
            .attr("cy", d => this.y(d.value))
            .attr("r", 6)
            .attr("fill", this.color(cantonSeries.id))
            .attr("stroke", "var(--border)")
            .attr("stroke-width", 2)
            .style("display", "block");
    }

    renderDetailedTooltip(closestPoint, cantonSeries, mx, my) {
        const ranking = stateManager.getRanking();
        const cantonRank = ranking.findIndex(r => r.id === cantonSeries.id) + 1;
        const totalCantons = ranking.length;

        this.tooltip
            .classed("visible", true)
            .style("left", `${mx}px`)
            .style("top", `${my}px`)
            .html(`
              <div class="tooltip-title">
                <img src="${cantonSeries.coat}" alt="" />
                <span>${cantonSeries.label} (${cantonSeries.id})</span>
              </div>
              <div>Wert: <strong>${formatValue(closestPoint.value)}%</strong></div>
              <div>Datum: ${formatDate(closestPoint.date)}</div>
              <div class="tooltip-rank">Rang: <strong>${cantonRank} / ${totalCantons}</strong> (Durchschnitt im Zeitraum)</div>
            `);
    }

    updateActiveStyles(activeCanton) {
        const selected = stateManager.selectedCompareCantons;
        const hasSelection = selected.size > 0;

        this.seriesGroup.selectAll("path.line")
            .style("display", d => !hasSelection || selected.has(d.id) ? "block" : "none")
            .classed("is-muted", d => activeCanton && d.id !== activeCanton)
            .classed("is-active", d => activeCanton && d.id === activeCanton);

        this.seriesGroup.selectAll("path.hit-line")
            .style("display", d => !hasSelection || selected.has(d.id) ? "block" : "none");

        if (activeCanton) {
            this.seriesGroup.selectAll("path.line").filter(d => d.id === activeCanton).raise();
            this.seriesGroup.selectAll("path.hit-line").filter(d => d.id === activeCanton).raise();
        }
    }
}
