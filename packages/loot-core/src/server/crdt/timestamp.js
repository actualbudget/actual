import murmurhash from 'murmurhash';

const uuid = require('../../platform/uuid');

/**
 * Hybrid Unique Logical Clock (HULC) timestamp generator
 *
 * Globally-unique, monotonic timestamps are generated from the
 *    combination of the unreliable system time, a counter, and an
 *    identifier for the current node (instance, machine, process, etc.).
 *    These timestamps can accommodate clock stuttering (duplicate values),
 *    regression, and node differences within the configured maximum drift.
 *
 * In order to generate timestamps locally or for transmission to another
 *    node, use the send() method. For global causality, timestamps must
 *    be included in each message processed by the system. Whenever a
 *    message is received, its timestamp must be passed to the recv()
 *    method.
 *
 * Timestamps serialize into a 46-character collatable string
 *    example: 2015-04-24T22:23:42.123Z-1000-0123456789ABCDEF
 *    example: 2015-04-24T22:23:42.123Z-1000-A219E7A71CC18912
 *
 * The 64-bit hybrid clock is based on the HLC specification,
 * http://www.cse.buffalo.edu/tech-reports/2014-04.pdf
 */

// A mutable global clock
let clock = null;

export function setClock(clock_) {
  clock = clock_;
}

export function getClock() {
  return clock;
}

export function makeClock(timestamp, merkle = {}) {
  return { timestamp: MutableTimestamp.from(timestamp), merkle };
}

export function serializeClock(clock) {
  return JSON.stringify({
    timestamp: clock.timestamp.toString(),
    merkle: clock.merkle
  });
}

export function deserializeClock(clock) {
  let data;
  try {
    data = JSON.parse(clock);
  } catch (e) {
    data = {
      timestamp: '1970-01-01T00:00:00.000Z-0000-' + makeClientId(),
      merkle: {}
    };
  }

  return {
    timestamp: MutableTimestamp.from(Timestamp.parse(data.timestamp)),
    merkle: data.merkle
  };
}

export function makeClientId() {
  return uuid.v4Sync().replace(/-/g, '').slice(-16);
}

var config = {
  // Allow 5 minutes of clock drift
  maxDrift: 5 * 60 * 1000
};

const MAX_COUNTER = parseInt('0xFFFF');
const MAX_NODE_LENGTH = 16;

/**
 * timestamp instance class
 */
export class Timestamp {
  constructor(millis, counter, node) {
    this._state = {
      millis: millis,
      counter: counter,
      node: node
    };
  }

  valueOf() {
    return this.toString();
  }

  toString() {
    return [
      new Date(this.millis()).toISOString(),
      ('0000' + this.counter().toString(16).toUpperCase()).slice(-4),
      ('0000000000000000' + this.node()).slice(-16)
    ].join('-');
  }

  millis() {
    return this._state.millis;
  }

  counter() {
    return this._state.counter;
  }

  node() {
    return this._state.node;
  }

  hash() {
    return murmurhash.v3(this.toString());
  }
}

class MutableTimestamp extends Timestamp {
  setMillis(n) {
    this._state.millis = n;
  }

  setCounter(n) {
    this._state.counter = n;
  }

  setNode(n) {
    this._state.node = n;
  }
}

MutableTimestamp.from = timestamp => {
  return new MutableTimestamp(
    timestamp.millis(),
    timestamp.counter(),
    timestamp.node()
  );
};

// Timestamp generator initialization
// * sets the node ID to an arbitrary value
// * useful for mocking/unit testing
Timestamp.init = function (options = {}) {
  if (options.maxDrift) {
    config.maxDrift = options.maxDrift;
  }

  setClock(
    makeClock(
      new Timestamp(
        0,
        0,
        options.node
          ? ('0000000000000000' + options.node).toString().slice(-16)
          : ''
      )
    ),
    null
  );
};

/**
 * Timestamp send. Generates a unique, monotonic timestamp suitable
 * for transmission to another system in string format
 */
Timestamp.send = function () {
  if (!clock) {
    return null;
  }

  // retrieve the local wall time
  var phys = Date.now();

  // unpack the clock.timestamp logical time and counter
  var lOld = clock.timestamp.millis();
  var cOld = clock.timestamp.counter();

  // calculate the next logical time and counter
  // * ensure that the logical time never goes backward
  // * increment the counter if phys time does not advance
  var lNew = Math.max(lOld, phys);
  var cNew = lOld === lNew ? cOld + 1 : 0;

  // check the result for drift and counter overflow
  if (lNew - phys > config.maxDrift) {
    throw new Timestamp.ClockDriftError(lNew, phys, config.maxDrift);
  }
  if (cNew > MAX_COUNTER) {
    throw new Timestamp.OverflowError();
  }

  // repack the logical time/counter
  clock.timestamp.setMillis(lNew);
  clock.timestamp.setCounter(cNew);

  return new Timestamp(
    clock.timestamp.millis(),
    clock.timestamp.counter(),
    clock.timestamp.node()
  );
};

// Timestamp receive. Parses and merges a timestamp from a remote
// system with the local timeglobal uniqueness and monotonicity are
// preserved
Timestamp.recv = function (msg) {
  if (!clock) {
    return null;
  }

  // retrieve the local wall time
  var phys = Date.now();

  // unpack the message wall time/counter
  var lMsg = msg.millis();
  var cMsg = msg.counter();

  // assert the node id and remote clock drift
  // if (msg.node() === clock.timestamp.node()) {
  //   throw new Timestamp.DuplicateNodeError(clock.timestamp.node());
  // }
  if (lMsg - phys > config.maxDrift) {
    throw new Timestamp.ClockDriftError();
  }

  // unpack the clock.timestamp logical time and counter
  var lOld = clock.timestamp.millis();
  var cOld = clock.timestamp.counter();

  // calculate the next logical time and counter
  // . ensure that the logical time never goes backward
  // . if all logical clocks are equal, increment the max counter
  // . if max = old > message, increment local counter
  // . if max = messsage > old, increment message counter
  // . otherwise, clocks are monotonic, reset counter
  var lNew = Math.max(Math.max(lOld, phys), lMsg);
  var cNew =
    lNew === lOld && lNew === lMsg
      ? Math.max(cOld, cMsg) + 1
      : lNew === lOld
      ? cOld + 1
      : lNew === lMsg
      ? cMsg + 1
      : 0;

  // check the result for drift and counter overflow
  if (lNew - phys > config.maxDrift) {
    throw new Timestamp.ClockDriftError();
  }
  if (cNew > MAX_COUNTER) {
    throw new Timestamp.OverflowError();
  }

  // repack the logical time/counter
  clock.timestamp.setMillis(lNew);
  clock.timestamp.setCounter(cNew);

  return new Timestamp(
    clock.timestamp.millis(),
    clock.timestamp.counter(),
    clock.timestamp.node()
  );
};

/**
 * timestamp parsing
 * converts a fixed-length string timestamp to the structured value
 */
Timestamp.parse = function (timestamp) {
  if (typeof timestamp === 'string') {
    var parts = timestamp.split('-');
    if (parts && parts.length === 5) {
      var millis = Date.parse(parts.slice(0, 3).join('-')).valueOf();
      var counter = parseInt(parts[3], 16);
      var node = parts[4];
      if (
        !isNaN(millis) &&
        millis >= 0 &&
        !isNaN(counter) &&
        counter <= MAX_COUNTER &&
        typeof node === 'string' &&
        node.length <= MAX_NODE_LENGTH
      ) {
        return new Timestamp(millis, counter, node);
      }
    }
  }
  return null;
};

/**
 * zero/minimum timestamp
 */
var zero = Timestamp.parse('1970-01-01T00:00:00.000Z-0000-0000000000000000');
Timestamp.zero = function () {
  return zero;
};

/**
 * maximum timestamp
 */
var max = Timestamp.parse('9999-12-31T23:59:59.999Z-FFFF-FFFFFFFFFFFFFFFF');
Timestamp.max = function () {
  return max;
};

Timestamp.since = isoString => {
  return isoString + '-0000-0000000000000000';
};

/**
 * error classes
 */
Timestamp.DuplicateNodeError = class extends Error {
  constructor(node) {
    super();
    this.type = 'DuplicateNodeError';
    this.message = 'duplicate node identifier ' + node;
  }
};

Timestamp.ClockDriftError = class extends Error {
  constructor(...args) {
    super();
    this.type = 'ClockDriftError';
    this.message = ['maximum clock drift exceeded'].concat(args).join(' ');
  }
};

Timestamp.OverflowError = class extends Error {
  constructor() {
    super();
    this.type = 'OverflowError';
    this.message = 'timestamp counter overflow';
  }
};
