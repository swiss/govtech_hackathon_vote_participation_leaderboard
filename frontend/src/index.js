import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import Intro from './Intro';

ReactDOM.render(
  <React.StrictMode>
    <Intro/>
    <div className="wrapper">
      <App />
    </div>
  </React.StrictMode>,
  document.getElementById('root')
);
