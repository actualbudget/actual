// This code is pulled from
// https://github.com/browserify/path-browserify/blob/master/index.js#L33

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i);
    else if (code === 47 /*/*/) break;
    else code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res.charCodeAt(res.length - 1) !== 46 /*.*/ ||
          res.charCodeAt(res.length - 2) !== 46 /*.*/
        ) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) res += '/..';
          else res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) res += '/' + path.slice(lastSlash + 1, i);
        else res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function normalizePath(path) {
  if (path.length === 0) return '.';

  var isAbsolute = path.charCodeAt(0) === 47; /*/*/
  var trailingSeparator = path.charCodeAt(path.length - 1) === 47; /*/*/

  // Normalize the path
  path = normalizeStringPosix(path, !isAbsolute);

  if (path.length === 0 && !isAbsolute) path = '.';
  if (path.length > 0 && trailingSeparator) path += '/';

  if (isAbsolute) return '/' + path;
  return path;
}

export default function join(...args) {
  if (args.length === 0) return '.';
  let joined;
  for (var i = 0; i < args.length; ++i) {
    var arg = args[i];
    if (arg.length > 0) {
      if (joined === undefined) joined = arg;
      else joined += '/' + arg;
    }
  }
  if (joined === undefined) return '.';
  return normalizePath(joined);
};
