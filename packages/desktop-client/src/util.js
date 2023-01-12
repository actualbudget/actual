import tokens from 'loot-design/src/tokens';

export function getModalRoute(name) {
  let parts = name.split('/');
  return [parts[0], parts.slice(1).join('/')];
}

export function isMobile(width) {
  // Simple detection: if the screen width is too small
  const containerWidth = width || window.innerWidth;
  return containerWidth < parseInt(tokens.breakpoint_medium);
}
