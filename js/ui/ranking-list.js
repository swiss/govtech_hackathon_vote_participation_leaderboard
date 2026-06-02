import {stateManager} from '../services/state-manager.js';
import {formatValue} from '../utils/formatters.js';

export class RankingList {
    constructor(selector) {
        this.container = d3.select(selector);
        this.rankingDescription = document.querySelector("#rankingDescription");
        this.topCanton = document.querySelector("#topCanton");
        this.topCantonSub = document.querySelector("#topCantonSub");

        stateManager.addEventListener("stateChanged", () => this.update());
        stateManager.addEventListener("activeCantonChanged", (e) => this.highlightItem(e.detail.id));
    }

    update() {
        const ranking = stateManager.getRanking();
        const top = ranking[0];
        const {state, votes} = stateManager;

        const startLabel = votes[state.fromIndex]?.dateLabel;
        const endLabel = votes[state.toIndex]?.dateLabel;

        if (this.rankingDescription) {
            this.rankingDescription.textContent = `Durchschnitt im Zeitraum ${startLabel} bis ${endLabel}`;
        }

        if (top && this.topCanton && this.topCantonSub) {
            this.topCanton.textContent = top.id;
            this.topCantonSub.textContent = `${top.label}: ${formatValue(top.score)}%`;
        }

        this.render(ranking);
    }

    render(ranking) {
        this.container
            .selectAll(".rank-item")
            .data(ranking, d => d.id)
            .join(
                enter => {
                    const item = enter.append("div")
                        .attr("class", "rank-item")
                        .on("pointerenter", (event, d) => stateManager.setActiveCanton(d.id))
                        .on("pointerleave", () => stateManager.setActiveCanton(null));

                    const checkboxWrap = item.append("div").attr("class", "rank-checkbox-wrap");
                    checkboxWrap.append("input")
                        .attr("type", "checkbox")
                        .attr("id", d => `check-${d.id}`)
                        .on("change", (event, d) => stateManager.toggleCantonSelection(d.id));

                    const info = item.append("div").attr("class", "rank-info");
                    info.append("img").attr("src", d => d.coat).attr("alt", "");

                    const text = item.append("div").attr("class", "rank-text");
                    text.append("div").attr("class", "rank-name").text(d => d.label);
                    text.append("div").attr("class", "rank-id").text(d => d.id);

                    item.append("div").attr("class", "rank-score").text(d => `${formatValue(d.score)}%`);

                    return item;
                },
                update => {
                    update.select(".rank-score").text(d => `${formatValue(d.score)}%`);
                    update.select("input").property("checked", d => stateManager.selectedCompareCantons.has(d.id));
                    return update;
                }
            )
            .order();
    }

    highlightItem(activeCanton) {
        this.container.selectAll(".rank-item")
            .classed("is-active", d => activeCanton && d.id === activeCanton);
    }
}
