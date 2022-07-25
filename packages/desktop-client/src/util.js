export function getModalRoute(name) {
  let parts = name.split('/');
  return [parts[0], parts.slice(1).join('/')];
}

export function isMobile(width) {
  // Simple detection: if the screen width is too small
  const containerWidth = width || window.innerWidth;
  return containerWidth < 600;
}

export function groupById(data) {
  let res = {};
  for (let i = 0; i < data.length; i++) {
    let item = data[i];
    res[item.id] = item;
  }
  return res;
}
