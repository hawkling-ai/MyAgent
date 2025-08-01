import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.scss';
import PatientManagement from './PatientManagement'
import Evals from './Evals'

function parseQuery(queryString: string) {
    var query: any = {};
    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

function App() {
 // You can set the following variables via URL query params, or by hard-coding them in. 
 // const providerId = PROVIDER_ID_HERE

 const queryVariables = parseQuery(window.location.search)
 
 // Use URL parameter if available, otherwise fall back to your real user ID
 const providerId = queryVariables.provider_id || "3635795" // Your Healthie user ID

  return (
    <Router>
      <div className="App">
        <nav style={{ padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
          <Link to="/" style={{ marginRight: '20px' }}>Patient Management</Link>
          <Link to="/evals">Evals</Link>
        </nav>
        <Routes>
          <Route path="/" element={<PatientManagement providerId={providerId} />} />
          <Route path="/evals" element={<Evals providerId={providerId} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
