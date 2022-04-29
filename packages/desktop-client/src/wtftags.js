let params = new URLSearchParams(window.location.search);

export function getWTFTag(tag) {
  return params.get(tag);
}
