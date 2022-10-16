export function groupBy(values, predicate) {
  return values.reduce(function (acc, item) {
    var key = predicate(item);

    if (!acc.hasOwnProperty(key)) {
      acc[key] = [];
    } // We limit each section to show 5 hits maximum.
    // This acts as a frontend alternative to `distinct`.


    if (acc[key].length < 5) {
      acc[key].push(item);
    }

    return acc;
  }, {});
}