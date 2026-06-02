import {stateManager} from '../services/state-manager.js';

export class SliderControls {
    constructor() {
        this.fromSlider = document.querySelector("#fromSlider");
        this.toSlider = document.querySelector("#toSlider");
        this.rangeLabel = document.querySelector("#rangeLabel");
        this.resetButton = document.querySelector("#resetButton");
        this.sportModeToggle = document.querySelector("#sportModeToggle");
        this.sliderTrackActive = document.querySelector(".slider-track-active");

        if (!this.sliderTrackActive) {
            const container = document.querySelector(".range-slider-container");
            this.sliderTrackActive = document.createElement("div");
            this.sliderTrackActive.className = "slider-track-active";
            container?.appendChild(this.sliderTrackActive);
        }

        this.setupEventListeners();
        stateManager.addEventListener("dataLoaded", () => this.init());
        stateManager.addEventListener("stateChanged", () => this.updateUI());
    }

    init() {
        const {votes} = stateManager;
        const maxIdx = votes.length - 1;

        this.fromSlider.min = 0;
        this.fromSlider.max = maxIdx;
        this.fromSlider.value = 0;

        this.toSlider.min = 0;
        this.toSlider.max = maxIdx;
        this.toSlider.value = maxIdx;

        stateManager.updateState({fromIndex: 0, toIndex: maxIdx});
    }

    setupEventListeners() {
        this.fromSlider.addEventListener("input", () => {
            let val = parseInt(this.fromSlider.value);
            let toVal = parseInt(this.toSlider.value);
            if (val > toVal) {
                this.fromSlider.value = toVal;
                val = toVal;
            }
            stateManager.updateState({fromIndex: val});
        });

        this.toSlider.addEventListener("input", () => {
            let val = parseInt(this.toSlider.value);
            let fromVal = parseInt(this.fromSlider.value);
            if (val < fromVal) {
                this.toSlider.value = fromVal;
                val = fromVal;
            }
            stateManager.updateState({toIndex: val});
        });

        this.resetButton?.addEventListener("click", () => {
            this.init();
        });

        this.sportModeToggle?.addEventListener("change", () => {
            stateManager.updateState({sportMode: this.sportModeToggle.checked});
        });
    }

    updateUI() {
        const {state, votes} = stateManager;
        const fromIdx = state.fromIndex;
        const toIdx = state.toIndex;

        const startLabel = votes[fromIdx]?.dateLabel || "";
        const endLabel = votes[toIdx]?.dateLabel || "";
        this.rangeLabel.textContent = `${startLabel} – ${endLabel}`;

        // Track Update
        const max = votes.length - 1;
        const p1 = (fromIdx / max) * 100;
        const p2 = (toIdx / max) * 100;
        if (this.sliderTrackActive) {
            this.sliderTrackActive.style.left = `${p1}%`;
            this.sliderTrackActive.style.width = `${p2 - p1}%`;
        }
    }
}
