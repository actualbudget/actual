import { createAlgoliaRequester } from './createAlgoliaRequester';
/**
 * Retrieves Algolia results from multiple indices.
 */

export var getAlgoliaResults = createAlgoliaRequester({
  transformResponse: function transformResponse(response) {
    return response.hits;
  }
});