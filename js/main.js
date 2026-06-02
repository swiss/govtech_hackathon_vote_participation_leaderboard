import {stateManager} from './services/state-manager.js';
import {loadData} from './services/data-service.js';
import {LineChart} from './charts/line-chart.js';
import {RaceChart} from './charts/race-chart.js';
import {RankTimeline} from './charts/rank-timeline.js';
import {SliderControls} from './ui/controls.js';
import {RankingList} from './ui/ranking-list.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Initialisierung der Komponenten
    const lineChart = new LineChart("#chart");
    const controls = new SliderControls();
    const rankingList = new RankingList("#rankingList");
    const raceChart = new RaceChart("#raceChart");
    const rankTimeline = new RankTimeline("#rankTimelineChart");

    // Daten laden
    await loadData();

    // Initiales Rendern erzwingen falls nötig
    if (stateManager.votes.length > 0) {
        raceChart.onStateChange();
        rankTimeline.render();
    }

    console.log("App modular initialisiert");
});
