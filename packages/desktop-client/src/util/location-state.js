let VERSION = Date.now();

export function makeLocationState(state) {
  return { ...state, _version: VERSION };
}

export function getLocationState(location, subfield) {
  if (location.state && location.state._version === VERSION) {
    return subfield ? location.state[subfield] : location.state;
  }
  return null;
}
