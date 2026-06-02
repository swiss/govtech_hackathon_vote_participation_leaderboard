class StateManager extends EventTarget {
    constructor() {
        super();
        this.data = [];
        this.votes = [];
        this.cantonIds = [];
        this.series = [];
        this.activeCanton = null;
        this.selectedCompareCantons = new Set();
        this.voteMetaByDate = new Map();
        this.voteEntriesById = new Map();

        this.state = {
            fromIndex: 0,
            toIndex: 0,
            rankingMode: "avg",
            sportMode: document.getElementById("sportModeToggle")?.checked || false
        };

        this.rankingCacheKey = "";
        this.rankingCacheValue = [];
    }

    setData(data, votes, cantonIds, series, voteEntriesById) {
        this.data = data;
        this.votes = votes;
        this.cantonIds = cantonIds;
        this.series = series;
        this.voteEntriesById = voteEntriesById;
        this.state.toIndex = votes.length - 1;
        this.notify("dataLoaded");
    }

    updateState(newState) {
        this.state = {...this.state, ...newState};
        this.notify("stateChanged");
    }

    toggleCantonSelection(id) {
        if (this.selectedCompareCantons.has(id)) {
            this.selectedCompareCantons.delete(id);
        } else {
            this.selectedCompareCantons.add(id);
        }
        this.notify("selectionChanged");
        this.notify("stateChanged");
    }

    setActiveCanton(id) {
        this.activeCanton = id;
        this.notify("activeCantonChanged", {id});
    }

    notify(type, detail = {}) {
        this.dispatchEvent(new CustomEvent(type, {detail}));
    }

    subscribe(callback) {
        this.addEventListener("stateChanged", callback);
        this.addEventListener("dataLoaded", callback);
    }

    getSelectedVotes() {
        return this.votes.slice(this.state.fromIndex, this.state.toIndex + 1);
    }

    getRanking() {
        const cacheKey = `${this.state.fromIndex}|${this.state.toIndex}`;
        if (cacheKey === this.rankingCacheKey) {
            return this.rankingCacheValue;
        }

        const selectedVotes = this.getSelectedVotes();
        const selectedData = [];
        for (const vote of selectedVotes) {
            const entries = this.voteEntriesById.get(vote.id);
            if (entries && entries.length) selectedData.push(...entries);
        }

        const grouped = Array.from(d3.group(selectedData, d => d.id), ([id, values]) => {
            values = values.sort((a, b) => d3.ascending(a.date, b.date));
            const first = values[0];
            const last = values.at(-1);
            const avg = d3.mean(values, d => d.value);
            const change = last.value - first.value;

            return {
                id,
                label: first.label,
                coat: first.coat,
                score: avg, // Standardmäßig Durchschnitt
                avg,
                end: last.value,
                change,
                first: first.value,
                last: last.value,
                count: values.length
            };
        });

        this.rankingCacheValue = grouped.sort((a, b) => d3.descending(a.score, b.score));
        this.rankingCacheKey = cacheKey;
        return this.rankingCacheValue;
    }
}

export const stateManager = new StateManager();
