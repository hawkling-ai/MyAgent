import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import rootUrl from './config/rootUrl';

import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  createHttpLink
} from "@apollo/client";
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: rootUrl,
});

const authLink = setContext((_, { headers }) => {
  // Get the API key from environment variables
  const apiKey = process.env.REACT_APP_HEALTHIE_API_KEY;
  
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      ...(apiKey && { 
        authorization: `Basic ${apiKey}`,
        AuthorizationSource: 'API'
      }),
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

const container = document.getElementById('clinical-analytics-root')!;
const root = createRoot(container);

root.render(
  <ApolloProvider client={client}>
	  <React.StrictMode>
	    <App />
	  </React.StrictMode>
  </ApolloProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
