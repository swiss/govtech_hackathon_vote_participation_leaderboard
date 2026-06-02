import {stateManager} from '../services/state-manager.js';
import {coatOfArms, fallbackCoat} from '../constants.js';

export class RankTimeline {
    constructor(selector) {
        this.svg = d3.select(selector);
        this.aggregationSelect = document.getElementById("rankAggregation");
        this.color = d3.scaleOrdinal().range(d3.schemeTableau10.concat(d3.schemeSet3));

        this.init();
        stateManager.subscribe(() => this.render());
    }

    init() {
        if (this.aggregationSelect) {
            this.aggregationSelect.addEventListener("change", () => this.render());
        }
    }

    getAggregationYears() {
        const mode = this.aggregationSelect?.value || "all";
        if (mode === "1y") return 1;
        if (mode === "5y") return 5;
        if (mode === "10y") return 10;
        return 0;
    }

    buildTimelineVotes() {
        const votes = stateManager.votes;
        const {fromIndex, toIndex} = stateManager.state;
        const filteredVotes = votes.slice(fromIndex, toIndex + 1);
        const bucketYears = this.getAggregationYears();

        if (bucketYears === 0) {
            return filteredVotes.map(vote => ({
                key: vote.date,
                label: new Date(vote.date).toLocaleDateString('de-CH', {month: '2-digit', year: 'numeric'}),
                cantons: vote.cantons.map(c => ({
                    id: c.id,
                    label: c.label,
                    value: Number(c.value)
                }))
            }));
        }

        if (!filteredVotes.length) return [];

        const firstYear = d3.min(filteredVotes, vote => new Date(vote.date).getFullYear());
        const buckets = new Map();

        for (const vote of filteredVotes) {
            const year = new Date(vote.date).getFullYear();
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
            for (const canton of vote.cantons) {
                const current = bucket.byCanton.get(canton.id) || {
                    id: canton.id,
                    label: canton.label,
                    sum: 0,
                    count: 0
                };
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

    render() {
        if (!this.svg.node() || stateManager.votes.length === 0) return;

        const timelineVotes = this.buildTimelineVotes();
        if (!timelineVotes.length) return;

        const xStep = 30;
        const minWidth = 980;
        const dynamicPlotWidth = Math.max(0, (timelineVotes.length - 1) * xStep);
        const width = Math.max(minWidth, 64 + dynamicPlotWidth + 24);
        const height = 700;
        const margin = {top: 24, right: 24, bottom: 90, left: 64};
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        this.svg
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("width", width)
            .attr("height", height)
            .style("width", `${width}px`)
            .style("height", `${height}px`);

        const frames = timelineVotes.map(vote => {
            const ranked = (vote.cantons || [])
                .sort((a, b) => d3.descending(a.value, b.value));

            return ranked.map((canton, index) => ({
                xKey: vote.key,
                rank: index + 1,
                id: canton.id,
                coat: coatOfArms[canton.id] || fallbackCoat
            }));
        });

        const points = frames.flat();
        const maxRank = d3.max(points, d => d.rank) || 1;

        this.svg.selectAll("*").remove();
        const g = this.svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scalePoint()
            .domain(timelineVotes.map(v => v.key))
            .range([0, chartWidth])
            .padding(0.4);

        const y = d3.scaleLinear()
            .domain([1, maxRank + 1])
            .range([0, chartHeight]);

        // Grid & Axes
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y).ticks(maxRank).tickSize(-chartWidth).tickFormat(""));

        g.append("g")
            .attr("class", "axis y-axis")
            .call(d3.axisLeft(y).tickValues(d3.range(1, maxRank + 1)).tickFormat(d => `#${d}`));

        g.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).tickFormat(d => {
                const vote = timelineVotes.find(v => v.key === d);
                return vote ? vote.label : d;
            }))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-0.7em")
            .attr("dy", "0.1em")
            .attr("transform", "rotate(-55)");

        // Lines
        const pointsByCanton = Array.from(
            d3.group(points, d => d.id),
            ([id, values]) => ({
                id,
                values: values.sort((a, b) => {
                    const keys = timelineVotes.map(v => v.key);
                    return d3.ascending(keys.indexOf(a.xKey), keys.indexOf(b.xKey));
                })
            })
        );

        const line = d3.line()
            .x(d => x(d.xKey))
            .y(d => y(d.rank));

        g.append("g")
            .attr("class", "rank-progress-group")
            .selectAll("path.rank-progress-line")
            .data(pointsByCanton, d => d.id)
            .join("path")
            .attr("class", "rank-progress-line")
            .attr("d", d => line(d.values))
            .attr("stroke", d => this.color(d.id))
            .style("fill", "none")
            .style("stroke-width", 2)
            .style("opacity", 0.4);

        // Marks (Coats of Arms)
        g.selectAll("image.rank-mark")
            .data(points)
            .join("image")
            .attr("class", "rank-mark")
            .attr("href", d => d.coat)
            .attr("x", d => x(d.xKey) - 9)
            .attr("y", d => y(d.rank) - 9)
            .attr("width", 18)
            .attr("height", 18);
    }
}
