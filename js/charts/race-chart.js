import {stateManager} from '../services/state-manager.js';
import {formatDate} from '../utils/formatters.js';

export class RaceChart {
    constructor(selector) {
        this.svg = d3.select(selector);
        this.width = 980;
        this.height = 600;
        this.margin = {top: 40, right: 120, bottom: 10, left: 240};
        this.n = 26;

        this.x = d3.scaleLinear().domain([0, 100]).range([this.margin.left, this.width - this.margin.right]);
        this.y = d3.scaleBand()
            .domain(d3.range(this.n + 1))
            .rangeRound([this.margin.top, this.margin.top + (this.height - this.margin.top - this.margin.bottom) * (this.n + 1) / this.n])
            .padding(0.3);

        this.color = d3.scaleOrdinal().range(d3.schemeTableau10.concat(d3.schemeSet3));

        this.raceKeyframes = [];
        this.raceK = 0;
        this.raceInterval = null;
        this.raceIsPaused = true;
        this.raceSpeed = 300;

        this.init();
        stateManager.subscribe(() => this.onStateChange());
    }

    init() {
        this.xAxisG = this.svg.append("g")
            .attr("class", "race-x-axis")
            .attr("transform", `translate(0, ${this.margin.top})`);

        this.raceDateLabel = document.getElementById("raceDateLabel");
        this.pauseRaceButton = document.getElementById("pauseRaceButton");
        this.replayRaceButton = document.getElementById("replayRaceButton");
        this.raceSpeedSelect = document.getElementById("raceSpeed");
        this.sportModeToggle = document.getElementById("sportModeToggle");

        if (this.replayRaceButton) {
            this.replayRaceButton.addEventListener("click", () => this.startRace(true));
        }
        if (this.pauseRaceButton) {
            this.pauseRaceButton.addEventListener("click", () => this.togglePause());
        }
        if (this.raceSpeedSelect) {
            this.raceSpeedSelect.addEventListener("change", () => {
                this.raceSpeed = Number(this.raceSpeedSelect.value);
            });
        }

        // Statische Rangnummern
        this.svg.selectAll("text.race-rank-static")
            .data(d3.range(this.n))
            .join("text")
            .attr("class", "race-rank-static")
            .attr("text-anchor", "start")
            .attr("x", 20)
            .attr("y", i => this.y(i) + this.y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .style("font-weight", i => i < 3 ? "900" : "700")
            .style("font-size", i => i === 0 ? "16px" : i < 3 ? "14px" : "13px")
            .style("fill", i => i === 0 ? "#b58900" : i === 1 ? "#64748b" : i === 2 ? "#a16207" : "var(--muted)")
            .text(i => `#${i + 1}`);
    }

    onStateChange() {
        // Wenn Daten neu geladen wurden oder sich der Zeitraum geändert hat
        if (stateManager.votes.length > 0) {
            this.prepareKeyframes();
            this.renderFrame(0, 0);
        }
    }

    prepareKeyframes() {
        const votes = stateManager.votes;
        const {fromIndex, toIndex, sportMode} = stateManager.state;
        const raceVotes = votes.slice(fromIndex, toIndex + 1);
        const windowSize = 10;

        const cantonIds = Array.from(new Set(votes.flatMap(v => v.cantons.map(c => c.id))));
        const voteIndexByTime = new Map(votes.map((vote, index) => [new Date(vote.date).getTime(), index]));

        this.raceKeyframes = [];
        for (const currentVote of raceVotes) {
            let frameCantons;

            if (sportMode) {
                frameCantons = currentVote.cantons.map(c => ({
                    id: c.id,
                    label: c.label,
                    value: Number(c.value)
                }));
            } else {
                const currentVoteTime = new Date(currentVote.date).getTime();
                const originalIndex = voteIndexByTime.get(currentVoteTime) ?? -1;
                if (originalIndex < 0) continue;

                const start = Math.max(0, originalIndex - windowSize + 1);
                const windowVotes = votes.slice(start, originalIndex + 1);

                frameCantons = cantonIds.map(cid => {
                    const values = [];
                    let label = cid;
                    for (const vote of windowVotes) {
                        const canton = vote.cantons.find(c => c.id === cid);
                        if (canton) {
                            values.push(Number(canton.value));
                            label = canton.label;
                        }
                    }
                    const avg = values.length > 0 ? d3.mean(values) : 0;
                    return {id: cid, label: label, value: avg};
                });
            }

            const sortedCantons = frameCantons.sort((a, b) => d3.descending(a.value, b.value));
            this.raceKeyframes.push([new Date(currentVote.date), sortedCantons]);
        }
    }

    startRace(startImmediately = true) {
        this.stopRace();
        this.prepareKeyframes();
        this.raceK = 0;
        this.raceIsPaused = !startImmediately;

        if (this.pauseRaceButton) {
            this.pauseRaceButton.textContent = startImmediately ? "⏸ Pause" : "▶ Starten";
        }

        if (startImmediately) {
            this.runRaceInterval();
        } else {
            this.renderFrame(0, 0);
        }
    }

    stopRace() {
        if (this.raceInterval) {
            cancelAnimationFrame(this.raceInterval);
            this.raceInterval = null;
        }
    }

    togglePause() {
        if (!this.raceInterval && this.raceK >= this.raceKeyframes.length) {
            this.startRace(true);
            return;
        }
        this.raceIsPaused = !this.raceIsPaused;
        if (this.raceIsPaused) {
            if (this.pauseRaceButton) this.pauseRaceButton.textContent = "▶ Fortsetzen";
            this.stopRace();
        } else {
            if (this.pauseRaceButton) this.pauseRaceButton.textContent = "⏸ Pause";
            this.runRaceInterval();
        }
    }

    runRaceInterval() {
        this.stopRace();
        let lastTs = performance.now();
        let elapsedMs = 0;

        const tick = (ts) => {
            if (this.raceIsPaused) return;

            elapsedMs += ts - lastTs;
            lastTs = ts;

            if (elapsedMs >= this.raceSpeed) {
                while (elapsedMs >= this.raceSpeed && this.raceK < this.raceKeyframes.length) {
                    const transitionDuration = Math.max(50, this.raceSpeed - 20);
                    this.renderFrame(this.raceK, transitionDuration);
                    this.raceK++;
                    elapsedMs -= this.raceSpeed;
                }

                if (this.raceK >= this.raceKeyframes.length) {
                    this.raceInterval = null;
                    if (this.pauseRaceButton) {
                        this.pauseRaceButton.textContent = "↺ Wiederholen";
                    }
                    return;
                }
            }
            this.raceInterval = requestAnimationFrame(tick);
        };
        this.raceInterval = requestAnimationFrame(tick);
    }

    renderFrame(index, transitionDuration) {
        if (!this.raceKeyframes[index]) return;
        const [date, frameData] = this.raceKeyframes[index];

        if (this.raceDateLabel) {
            this.raceDateLabel.textContent = formatDate(date);
        }

        const displayedData = frameData.slice(0, this.n);
        const xAxis = d3.axisTop(this.x).ticks(this.width / 160).tickSizeOuter(0).tickSizeInner(-this.height + this.margin.top + this.margin.bottom);

        this.xAxisG.transition("race-transition").duration(transitionDuration).ease(d3.easeLinear).call(xAxis);
        this.xAxisG.select(".domain").remove();

        // Balken
        this.svg.selectAll("rect.bar")
            .data(displayedData, d => d.id)
            .join(
                enter => enter.append("rect")
                    .attr("class", "bar")
                    .attr("fill", d => this.color(d.id))
                    .attr("x", this.x(0))
                    .attr("y", d => this.y(this.n))
                    .attr("height", this.y.bandwidth())
                    .attr("width", 0),
                update => update,
                exit => exit.transition("race-transition").duration(transitionDuration).attr("width", 0).attr("y", this.y(this.n)).remove()
            )
            .classed("podium-1", (d, i) => i === 0)
            .classed("podium-2", (d, i) => i === 1)
            .classed("podium-3", (d, i) => i === 2)
            .transition("race-transition").duration(transitionDuration).ease(d3.easeLinear)
            .attr("y", (d, i) => this.y(i))
            .attr("width", d => this.x(d.value) - this.x(0));

        // Labels
        this.svg.selectAll("text.bar-label")
            .data(displayedData, d => d.id)
            .join(
                enter => enter.append("text")
                    .attr("class", "bar-label")
                    .attr("text-anchor", "end")
                    .attr("x", this.x(0) - 45)
                    .attr("y", d => this.y(this.n) + this.y.bandwidth() / 2)
                    .attr("dy", "0.35em"),
                update => update,
                exit => exit.transition("race-transition").duration(transitionDuration).attr("y", this.y(this.n)).remove()
            )
            .text(d => d.label)
            .transition("race-transition").duration(transitionDuration).ease(d3.easeLinear)
            .attr("y", (d, i) => this.y(i) + this.y.bandwidth() / 2);

        // Werte
        this.svg.selectAll("text.bar-value")
            .data(displayedData, d => d.id)
            .join(
                enter => enter.append("text")
                    .attr("class", "bar-value")
                    .attr("text-anchor", "start")
                    .attr("x", d => this.x(d.value) + 10)
                    .attr("y", d => this.y(this.n) + this.y.bandwidth() / 2)
                    .attr("dy", "0.35em"),
                update => update,
                exit => exit.transition("race-transition").duration(transitionDuration).attr("y", this.y(this.n)).remove()
            )
            .text(d => `${d.value.toFixed(1)}%`)
            .transition("race-transition").duration(transitionDuration).ease(d3.easeLinear)
            .attr("x", d => this.x(d.value) + 10)
            .attr("y", (d, i) => this.y(i) + this.y.bandwidth() / 2);
    }
}
