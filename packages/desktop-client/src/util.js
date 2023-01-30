export function getModalRoute(name) {
  let parts = name.split('/');
  return [parts[0], parts.slice(1).join('/')];
}
