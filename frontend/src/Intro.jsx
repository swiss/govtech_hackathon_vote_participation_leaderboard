import './Intro.css';

function Intro() {
  return (
    <div className="intro">
      <h1>D3.js Leaderboard</h1>

      <p>
        Here is a small leaderboard made with D3.js. It is responsive, updates in real-time and can be easily customized.
      </p>

      <p>
        Check out the <a href="https://github.com/rhidra/d3js-leaderboard" target="_blank">source code here</a>, and 
        the original <a href="https://blog.remyhidra.dev/" target="_blank">blog post here</a>.
      </p>
    </div>
  );
}

export default Intro;