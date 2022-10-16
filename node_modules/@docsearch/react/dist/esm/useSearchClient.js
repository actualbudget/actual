import algoliasearch from 'algoliasearch/dist/algoliasearch-lite.esm.browser';
import React from 'react';
import { version } from './version';
export function useSearchClient(appId, apiKey, transformSearchClient) {
  var searchClient = React.useMemo(function () {
    var client = algoliasearch(appId, apiKey);
    client.addAlgoliaAgent('docsearch', version); // Since DocSearch.js relies on DocSearch React with an alias to Preact,
    // we cannot add the `docsearch-react` user agent by default, otherwise
    // it would also be sent on a DocSearch.js integration.
    // We therefore only add the `docsearch-react` user agent if `docsearch.js`
    // is not present.

    if (/docsearch.js \(.*\)/.test(client.transporter.userAgent.value) === false) {
      client.addAlgoliaAgent('docsearch-react', version);
    }

    return transformSearchClient(client);
  }, [appId, apiKey, transformSearchClient]);
  return searchClient;
}