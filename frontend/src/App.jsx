import './App.css';
import Leaderboard from './Leaderboard';
import { getData } from './data';
import { useEffect, useState, useCallback } from 'react';
import useMeasure from 'react-use-measure';

function App() {
  // Leaderboard panel width
  const [ref, {width: leaderboardWidth}] = useMeasure({debounce: 100});

  // Leaderboard data
  const [data, setData] = useState([]);

  // Update the array
  const refreshData = useCallback(() => getData().then(d => setData(d)), []);

  // Fill the data array at the page load
  useEffect(() => refreshData(), [refreshData]);

  return (
    <div className="app">
      <div className="leaderboard-container" ref={ref}>
        <Leaderboard
          data={data}
          width={leaderboardWidth}
        />
      </div>

      <div className="button">
        <button onClick={() => refreshData()}>Refresh Data</button>
      </div>
    </div>
  );
}

export default App;
