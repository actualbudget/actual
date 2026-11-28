import type { ReservationsBridge } from '@actual-app/core/server/budget/pocket-readers';
import type { FxImpactResult } from '@actual-app/core/types/models';

import { fxImpactFixture } from '#mocks/fxImpact';
import {
  br1Reservations,
  mm1Reservations,
  ov2Reservations,
} from '#mocks/fxReservations';

import { buildFxImpactCsv, buildFxImpactRecords } from './fx-impact-export';

function withReservations(reservations: ReservationsBridge): FxImpactResult {
  return {
    ...fxImpactFixture,
    months: fxImpactFixture.months.map(month => ({
      ...month,
      bridge: month.bridge && { ...month.bridge, reservations },
    })),
  };
}

const ofType = (result: FxImpactResult, type: string) =>
  buildFxImpactRecords(result).filter(record => record.Type === type);

// MC-10.3 (BR1, BR3): the MC-9 export carries the reservations section.
describe('reservations in the FX impact export', () => {
  it('BR1 writes the captured cells, the split and each currency and lane after the bridge', () => {
    const result = withReservations(br1Reservations);
    expect(
      buildFxImpactRecords(result).map(r => [
        r.Type,
        r['Account ID'] || r.Currency,
      ]),
    ).toEqual([
      ['account', 'yen'],
      ['account', 'dinar'],
      ['currency', 'JPY'],
      ['currency', 'KWD'],
      ['budget-currency-fees', 'USD'],
      ['total', ''],
      ['on-budget', ''],
      ['bridge', ''],
      ['bridge-account', 'yen'],
      ['reservations', ''],
      ['reservation-currency', 'JPY'],
      ['reservation-lane', 'JPY'],
      ['exchange', ''],
    ]);
    expect(ofType(result, 'reservations')[0]).toMatchObject({
      Month: '2016-12',
      Contribution: '125.00',
      'Contribution incomplete': 'false',
      'Included in To Budget': '125.00',
      'Included incomplete': 'false',
      Pending: 'false',
      Assigned: '100.00',
      Remainder: '25.00',
    });
    expect(ofType(result, 'reservation-currency')[0]).toMatchObject({
      Currency: 'JPY',
      Valuation: 'market',
      Rule: '2',
      'Closing rate date': '2026-01-31',
      'Closing rate': '80',
      Holdings: '10000',
      'Booked holdings': '100.00',
      Reserved: '10000',
      Unreserved: '0',
      'Holdings value': '125.00',
      'Included FX': '25.00',
      'Included value': '125.00',
      'Pocket total': '125.00',
      'Included reservation': '125.00',
      'Exact change': '125.00',
      'Written change': '125.00',
      Funds: '0.00',
      Shortage: 'false',
      Reasons: '',
    });
    expect(ofType(result, 'reservation-lane')[0]).toMatchObject({
      Currency: 'JPY',
      'Lane ID': 'travelJpy',
      'Category ID': 'travel',
      Budgeted: '10000',
      'Budgeted base': '100.00',
      'Capture date': '2026-01-31',
      Balance: '10000',
      'Balance base': '125.00',
      'Value kind': 'resolved',
      'Reservation FX': '25.00',
    });
  });

  it('BR3 OV2 leaves unrepresentable figures empty and names the reasons', () => {
    const currency = ofType(
      withReservations(ov2Reservations),
      'reservation-currency',
    )[0];
    expect(currency).toMatchObject({
      'Pocket total': '',
      'Exact change': '',
      'Included reservation': '0.00',
      'Written change': '0.00',
      Funds: '0.00',
      Reserved: '',
      Shortage: 'true',
    });
    expect(currency.Reasons).toBe(
      'entry-pending; amount-out-of-range; reservation-incomplete',
    );
    expect(
      ofType(withReservations(ov2Reservations), 'reservations')[0],
    ).toMatchObject({ 'Contribution incomplete': 'true', Assigned: '' });
  });

  it('BR3 MM1 labels an unknown native without a rule', () => {
    expect(
      ofType(withReservations(mm1Reservations), 'reservation-currency')[0],
    ).toMatchObject({
      Valuation: 'unknown-native',
      Rule: '',
      'Pocket total': '40.00',
    });
  });

  it('keeps one header row of fixed columns', () => {
    const header = buildFxImpactCsv(withReservations(br1Reservations)).split(
      '\n',
    )[0];
    expect(header).toContain('Pocket total');
    expect(header).toContain('Reservation FX');
  });
});
