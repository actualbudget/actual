function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

export function createRequester(fetcher, requesterId) {
  function execute(fetcherParams) {
    return fetcher({
      searchClient: fetcherParams.searchClient,
      queries: fetcherParams.requests.map(function (x) {
        return x.query;
      })
    }).then(function (responses) {
      return responses.map(function (response, index) {
        var _fetcherParams$reques = fetcherParams.requests[index],
            sourceId = _fetcherParams$reques.sourceId,
            transformResponse = _fetcherParams$reques.transformResponse;
        return {
          items: response,
          sourceId: sourceId,
          transformResponse: transformResponse
        };
      });
    });
  }

  return function createSpecifiedRequester(requesterParams) {
    return function requester(requestParams) {
      return _objectSpread(_objectSpread({
        requesterId: requesterId,
        execute: execute
      }, requesterParams), requestParams);
    };
  };
}