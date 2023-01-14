import { Timestamp } from './timestamp';

describe('Timestamp', function () {
  let now = 0;

  beforeEach(function () {
    Date.prevNow = Date.now;
    Date.now = () => now;
    Timestamp.init({ node: '1' });
  });

  afterEach(() => {
    Date.now = Date.prevNow;
  });

  describe('comparison', function () {
    it('should be in order', function () {
      expect(Timestamp.zero()).toBe(Timestamp.zero());
      expect(Timestamp.max() > Timestamp.zero()).toBeTruthy();
      expect(Timestamp.send() > Timestamp.zero()).toBeTruthy();
      expect(Timestamp.send() < Timestamp.max()).toBeTruthy();
    });
  });

  describe('parsing', function () {
    it('should not parse', function () {
      var invalidInputs = [
        null,
        undefined,
        {},
        [],
        42,
        '',
        ' ',
        '0',
        'invalid',
        '1969-1-1T0:0:0.0Z-0-0-0',
        '1969-01-01T00:00:00.000Z-0000-0000000000000000',
        '10000-01-01T00:00:00.000Z-FFFF-FFFFFFFFFFFFFFFF',
        '9999-12-31T23:59:59.999Z-10000-FFFFFFFFFFFFFFFF',
        '9999-12-31T23:59:59.999Z-FFFF-10000000000000000'
      ];
      for (var invalidInput of invalidInputs) {
        expect(Timestamp.parse(invalidInput)).toBe(null);
      }
    });

    it('should parse', function () {
      var validInputs = [
        '1970-01-01T00:00:00.000Z-0000-0000000000000000',
        '2015-04-24T22:23:42.123Z-1000-0123456789ABCDEF',
        '9999-12-31T23:59:59.999Z-FFFF-FFFFFFFFFFFFFFFF'
      ];
      for (var validInput of validInputs) {
        var parsed = Timestamp.parse(validInput);
        expect(typeof parsed).toBe('object');
        expect(parsed.millis() >= 0).toBeTruthy();
        expect(parsed.millis() < 253402300800000).toBeTruthy();
        expect(parsed.counter() >= 0).toBeTruthy();
        expect(parsed.counter() < 65536).toBeTruthy();
        expect(typeof parsed.node()).toBe('string');
        expect(parsed.toString()).toBe(validInput);
      }
    });
  });

  describe('send', function () {
    it('should send monotonically with a monotonic clock', function () {
      now = 10;
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.010Z-0000-0000000000000001')
      );
      now++;
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.011Z-0000-0000000000000001')
      );
      now++;
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.012Z-0000-0000000000000001')
      );
    });

    it('should send monotonically with a stuttering clock', function () {
      now = 20;
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.020Z-0000-0000000000000001')
      );
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.020Z-0001-0000000000000001')
      );
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.020Z-0002-0000000000000001')
      );
      now++;
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.021Z-0000-0000000000000001')
      );
    });

    it('should send monotonically with a regressing clock', function () {
      now = 30;
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.030Z-0000-0000000000000001')
      );
      now--;
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.030Z-0001-0000000000000001')
      );
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.030Z-0002-0000000000000001')
      );
      now = 31;
      expect(Timestamp.send()).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.031Z-0000-0000000000000001')
      );
    });

    it('should fail with counter overflow', function () {
      now = 40;
      for (var i = 0; i < 65536; i++) Timestamp.send();
      expect(Timestamp.send).toThrow(Timestamp.OverflowError);
    });

    it('should fail with clock drift', function () {
      now = -(5 * 60 * 1000 + 1);
      expect(Timestamp.send).toThrow(Timestamp.ClockDriftError);
    });
  });

  describe('recv', function () {
    it('should receive monotonically with a global monotonic clock', function () {
      now = 52;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.051Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.052Z-0000-0000000000000001')
      );
      now = 54;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.053Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.054Z-0000-0000000000000001')
      );
      now = 56;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.055Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.056Z-0000-0000000000000001')
      );
    });

    it('should receive monotonically with a global stuttering clock', function () {
      now = 61;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.062Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.062Z-0001-0000000000000001')
      );
      now = 62;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.062Z-0001-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.062Z-0002-0000000000000001')
      );
      now = 62;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.062Z-0002-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.062Z-0003-0000000000000001')
      );
      now = 63;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.062Z-0004-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.063Z-0000-0000000000000001')
      );
    });

    it('should receive monotonically with a local stuttering clock', function () {
      now = 73;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.071Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.073Z-0000-0000000000000001')
      );
      now = 73;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.072Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.073Z-0001-0000000000000001')
      );
      now = 74;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.073Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.074Z-0000-0000000000000001')
      );
    });

    it('should receive monotonically with a remote stuttering clock', function () {
      now = 81;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.083Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.083Z-0001-0000000000000001')
      );
      now = 82;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.083Z-0001-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.083Z-0002-0000000000000001')
      );
      now = 83;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.083Z-0002-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.083Z-0003-0000000000000001')
      );
      now = 84;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.083Z-0003-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.084Z-0000-0000000000000001')
      );
    });
    it('should receive monotonically with a local regressing clock', function () {
      now = 93;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.091Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.093Z-0000-0000000000000001')
      );
      now = 92;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.092Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.093Z-0001-0000000000000001')
      );
      now = 91;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.093Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.093Z-0002-0000000000000001')
      );
    });
    it('should receive monotonically with a remote regressing clock', function () {
      now = 101;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.103Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.103Z-0001-0000000000000001')
      );
      now = 102;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.102Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.103Z-0002-0000000000000001')
      );
      now = 103;
      expect(
        Timestamp.recv(
          Timestamp.parse('1970-01-01T00:00:00.101Z-0000-0000000000000002')
        )
      ).toEqual(
        Timestamp.parse('1970-01-01T00:00:00.103Z-0003-0000000000000001')
      );
    });

    // it('should fail with a duplicate node id', function() {
    //   expect(function() {
    //     Timestamp.recv(
    //       Timestamp.parse('1970-01-01T00:00:00.101Z-0000-0000000000000001')
    //     );
    //   }).toThrow(Timestamp.DuplicateNodeError);
    // });

    it('should fail with clock drift', function () {
      expect(function () {
        Timestamp.recv(
          Timestamp.parse('1980-01-01T00:00:00.101Z-0000-0000000000000002')
        );
      }).toThrow(Timestamp.ClockDriftError);
    });
  });
});
