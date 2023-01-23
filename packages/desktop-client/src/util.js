export function getModalRoute(name) {
  let parts = name.split('/');
  return [parts[0], parts.slice(1).join('/')];
}

export function isMobile() {
  let details = navigator.userAgent;
  let regexp = /Mobi|android|iphone|kindle|ipad/i;
  return regexp.test(details);
}
