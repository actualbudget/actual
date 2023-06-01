export function getModalRoute(name: string): [string, string] {
  let parts = name.split('/');
  return [parts[0], parts.slice(1).join('/')];
}
