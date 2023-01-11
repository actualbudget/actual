import * as merkle from './merkle';
import { Timestamp } from './timestamp';

function message(timestamp, hash) {
  timestamp = Timestamp.parse(timestamp);
  timestamp.hash = () => hash;
  return { timestamp };
}

function insertMessages(trie, messages) {
  messages.forEach(msg => {
    trie = merkle.insert(trie, msg.timestamp);
  });
  return trie;
}

describe('merkle trie', () => {
  test('adding an item works', () => {
    let trie = merkle.insert(
      {},
      Timestamp.parse('2018-11-12T13:21:40.122Z-0000-0123456789ABCDEF')
    );
    trie = merkle.insert(
      trie,
      Timestamp.parse('2018-11-13T13:21:40.122Z-0000-0123456789ABCDEF')
    );
    expect(trie).toMatchSnapshot();
  });

  test('diff returns the correct time difference', () => {
    let trie1 = {};
    let trie2 = {};

    const messages = [
      // First client messages
      message('2018-11-13T13:20:40.122Z-0000-0123456789ABCDEF', 1000),
      message('2018-11-14T13:05:35.122Z-0000-0123456789ABCDEF', 1100),
      message('2018-11-15T22:19:00.122Z-0000-0123456789ABCDEF', 1200),

      // Second client messages
      message('2018-11-20T13:19:40.122Z-0000-0123456789ABCDEF', 1300),
      message('2018-11-25T13:19:40.122Z-0000-0123456789ABCDEF', 1400)
    ];

    trie1 = merkle.insert(trie1, messages[0].timestamp);
    trie1 = merkle.insert(trie1, messages[1].timestamp);
    trie1 = merkle.insert(trie1, messages[2].timestamp);
    expect(trie1.hash).toBe(788);

    trie2 = merkle.insert(trie2, messages[3].timestamp);
    trie2 = merkle.insert(trie2, messages[4].timestamp);
    expect(trie2.hash).toBe(108);

    expect(new Date(merkle.diff(trie1, trie2)).toISOString()).toBe(
      '2018-11-02T17:15:00.000Z'
    );

    trie1 = merkle.insert(trie1, messages[3].timestamp);
    trie1 = merkle.insert(trie1, messages[4].timestamp);
    trie2 = merkle.insert(trie2, messages[0].timestamp);
    trie2 = merkle.insert(trie2, messages[1].timestamp);
    trie2 = merkle.insert(trie2, messages[2].timestamp);
    expect(trie1.hash).toBe(888);
    expect(trie1.hash).toBe(trie2.hash);
  });

  test('diffing works with empty tries', () => {
    let trie1 = {};
    let trie2 = merkle.insert(
      {},
      Timestamp.parse('2009-01-02T10:17:37.789Z-0000-0000testinguuid1')
    );

    expect(merkle.diff(trie1, trie2)).toBe(0);
  });

  test('pruning works and keeps correct hashes', () => {
    let messages = [
      message('2018-11-01T01:00:00.000Z-0000-0123456789ABCDEF', 1000),
      message('2018-11-01T01:09:00.000Z-0000-0123456789ABCDEF', 1100),
      message('2018-11-01T01:18:00.000Z-0000-0123456789ABCDEF', 1200),
      message('2018-11-01T01:27:00.000Z-0000-0123456789ABCDEF', 1300),
      message('2018-11-01T01:36:00.000Z-0000-0123456789ABCDEF', 1400),
      message('2018-11-01T01:45:00.000Z-0000-0123456789ABCDEF', 1500),
      message('2018-11-01T01:54:00.000Z-0000-0123456789ABCDEF', 1600),
      message('2018-11-01T02:03:00.000Z-0000-0123456789ABCDEF', 1700),
      message('2018-11-01T02:10:00.000Z-0000-0123456789ABCDEF', 1800),
      message('2018-11-01T02:19:00.000Z-0000-0123456789ABCDEF', 1900),
      message('2018-11-01T02:28:00.000Z-0000-0123456789ABCDEF', 2000),
      message('2018-11-01T02:37:00.000Z-0000-0123456789ABCDEF', 2100)
    ];

    let trie = {};
    messages.forEach(msg => {
      trie = merkle.insert(trie, msg.timestamp);
    });
    expect(trie.hash).toBe(2496);
    expect(trie).toMatchSnapshot();

    let pruned = merkle.prune(trie);
    expect(pruned.hash).toBe(2496);
    expect(pruned).toMatchSnapshot();
  });

  test('diffing differently shaped tries returns correct time', () => {
    let messages = [
      message('2018-11-01T01:00:00.000Z-0000-0123456789ABCDEF', 1000),
      message('2018-11-01T01:09:00.000Z-0000-0123456789ABCDEF', 1100),
      message('2018-11-01T01:18:00.000Z-0000-0123456789ABCDEF', 1200),
      message('2018-11-01T01:27:00.000Z-0000-0123456789ABCDEF', 1300),
      message('2018-11-01T01:36:00.000Z-0000-0123456789ABCDEF', 1400),
      message('2018-11-01T01:45:00.000Z-0000-0123456789ABCDEF', 1500),
      message('2018-11-01T01:54:00.000Z-0000-0123456789ABCDEF', 1600),
      message('2018-11-01T02:03:00.000Z-0000-0123456789ABCDEF', 1700),
      message('2018-11-01T02:10:00.000Z-0000-0123456789ABCDEF', 1800),
      message('2018-11-01T02:19:00.000Z-0000-0123456789ABCDEF', 1900),
      message('2018-11-01T02:28:00.000Z-0000-0123456789ABCDEF', 2000),
      message('2018-11-01T02:37:00.000Z-0000-0123456789ABCDEF', 2100)
    ];

    let trie = insertMessages({}, messages);

    // Case 0: It always returns a base time when comparing with an
    // empty trie
    expect(new Date(merkle.diff({}, trie)).toISOString()).toBe(
      '1970-01-01T00:00:00.000Z'
    );
    expect(new Date(merkle.diff(trie, {})).toISOString()).toBe(
      '1970-01-01T00:00:00.000Z'
    );

    // Case 1: Add an older message that modifies the trie in such a
    // way that it modifies the 1st out of 3 branches (so it will be
    // pruned away)
    let trie1 = insertMessages(trie, [
      message('2018-11-01T00:59:00.000Z-0000-0123456789ABCDEF', 900)
    ]);

    // Normal comparision works
    expect(new Date(merkle.diff(trie1, trie)).toISOString()).toBe(
      '2018-11-01T00:54:00.000Z'
    );

    // Comparing the pruned new trie is lossy, so it returns an even older time
    expect(new Date(merkle.diff(merkle.prune(trie1), trie)).toISOString()).toBe(
      '2018-11-01T00:45:00.000Z'
    );

    // Comparing the pruned original trie is just as lossy
    expect(new Date(merkle.diff(trie1, merkle.prune(trie))).toISOString()).toBe(
      '2018-11-01T00:45:00.000Z'
    );

    // Pruning both tries is just as lossy as well, since the changed
    // key is pruned away in both cases and it won't find a changed
    // key so it bails at the point
    expect(
      new Date(
        merkle.diff(merkle.prune(trie1), merkle.prune(trie))
      ).toISOString()
    ).toBe('2018-11-01T00:45:00.000Z');

    // Case 2: Add two messages similar to the above case, but the
    // second message modifies the 2nd key at the same level as the
    // first message modifiying the 1st key
    let trie2 = insertMessages(trie, [
      message('2018-11-01T00:59:00.000Z-0000-0123456789ABCDEF', 900),
      message('2018-11-01T01:15:00.000Z-0000-0123456789ABCDEF', 1422)
    ]);

    // Normal comparision works
    expect(new Date(merkle.diff(trie2, trie)).toISOString()).toBe(
      '2018-11-01T00:54:00.000Z'
    );

    // Same as case 1
    expect(new Date(merkle.diff(merkle.prune(trie2), trie)).toISOString()).toBe(
      '2018-11-01T00:45:00.000Z'
    );

    // Same as case 1
    expect(new Date(merkle.diff(trie2, merkle.prune(trie))).toISOString()).toBe(
      '2018-11-01T00:45:00.000Z'
    );

    // Pruning both tries is very lossy and this ends up returning a
    // time that only covers the second message. Syncing will need
    // multiple passes to sync up. This happens because the second
    // message provides a "changed path" that the diff takes which
    // ignores the first message.
    expect(
      new Date(
        merkle.diff(merkle.prune(trie2), merkle.prune(trie))
      ).toISOString()
    ).toBe('2018-11-01T01:12:00.000Z');
  });
});
