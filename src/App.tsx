import React from 'react';
import './App.scss';
import PatientManagement from './PatientManagement'

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
    <div className="App">
      <PatientManagement providerId={providerId} />
    </div>
  );
}

export default App;
