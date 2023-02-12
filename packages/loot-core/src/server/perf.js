let enabled = false;
let entries = {};
let counters = {};

export function reset() {
  entries = {};
  counters = {};
}

export function record(name) {
  const start = Date.now();
  return () => unrecord(name, start);
}

function unrecord(name, start) {
  const end = Date.now();

  if (enabled) {
    if (entries[name] == null) {
      entries[name] = [];
    }
    entries[name].push(end - start);
  }
}

export function increment(name) {
  if (enabled) {
    if (counters[name] == null) {
      counters[name] = 0;
    }
    counters[name]++;
  }
}

export function start() {
  enabled = true;
}

export function stop() {
  enabled = false;

  console.log('~~ PERFORMANCE REPORT ~~');
  for (let name in entries) {
    const records = entries[name];
    const total = records.reduce((total, n) => total + n / 1000, 0);
    const avg = total / records.length;

    console.log(
      `[${name}] count: ${records.length} total: ${total}s avg: ${avg}`,
    );
  }

  for (let name in counters) {
    console.log(`[${name}] ${counters[name]}`);
  }
  console.log('~~ END REPORT ~~');

  reset();
}
