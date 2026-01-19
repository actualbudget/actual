import { DEFAULT_MAX_DISTANCE_METERS } from 'loot-core/shared/constants';

import { type Diff } from '../../shared/util';
import {
  type PayeeEntity,
  type PayeeLocationEntity,
  type RuleEntity,
} from '../../types/models';
import { createApp } from '../app';
import * as db from '../db';
import { payeeModel } from '../models';
import { mutator } from '../mutators';
import { batchMessages } from '../sync';
import * as rules from '../transactions/transaction-rules';
import { undoable } from '../undo';

export type PayeesHandlers = {
  'payee-create': typeof createPayee;
  'common-payees-get': typeof getCommonPayees;
  'payees-get': typeof getPayees;
  'payees-get-orphaned': typeof getOrphanedPayees;
  'payees-get-rule-counts': typeof getPayeeRuleCounts;
  'payees-merge': typeof mergePayees;
  'payees-batch-change': typeof batchChangePayees;
  'payees-check-orphaned': typeof checkOrphanedPayees;
  'payees-get-rules': typeof getPayeeRules;
  'payee-location-create': typeof createPayeeLocation;
  'payee-locations-get': typeof getPayeeLocations;
  'payee-location-delete': typeof deletePayeeLocation;
  'payees-get-nearby': typeof getNearbyPayees;
};

export const app = createApp<PayeesHandlers>();
app.method('payee-create', mutator(undoable(createPayee)));
app.method('common-payees-get', getCommonPayees);
app.method('payees-get', getPayees);
app.method('payees-get-orphaned', getOrphanedPayees);
app.method('payees-get-rule-counts', getPayeeRuleCounts);
app.method(
  'payees-merge',
  mutator(
    undoable(mergePayees, args => ({
      mergeIds: args.mergeIds,
      targetId: args.targetId,
    })),
  ),
);
app.method('payees-batch-change', mutator(undoable(batchChangePayees)));
app.method('payees-check-orphaned', checkOrphanedPayees);
app.method('payees-get-rules', getPayeeRules);
app.method('payee-location-create', mutator(createPayeeLocation));
app.method('payee-locations-get', getPayeeLocations);
app.method('payee-location-delete', mutator(deletePayeeLocation));
app.method('payees-get-nearby', getNearbyPayees);

async function createPayee({ name }: { name: PayeeEntity['name'] }) {
  return db.insertPayee({ name });
}

async function getCommonPayees(): Promise<PayeeEntity[]> {
  // TODO: Update to an AQL query. Server must return AQL entities not the raw DB data.
  return (await db.getCommonPayees()).map(payeeModel.fromDb);
}

async function getPayees(): Promise<PayeeEntity[]> {
  // TODO: Update to an AQL query. Server must return AQL entities not the raw DB data.
  return (await db.getPayees()).map(payeeModel.fromDb);
}

async function getOrphanedPayees(): Promise<Array<Pick<PayeeEntity, 'id'>>> {
  return await db.syncGetOrphanedPayees();
}

async function getPayeeRuleCounts() {
  const payeeCounts: Record<PayeeEntity['id'], number> = {};

  rules.iterateIds(rules.getRules(), 'payee', (rule, id) => {
    if (payeeCounts[id] == null) {
      payeeCounts[id] = 0;
    }
    payeeCounts[id]++;
  });

  return payeeCounts;
}

async function mergePayees({
  targetId,
  mergeIds,
}: {
  targetId: PayeeEntity['id'];
  mergeIds: Array<PayeeEntity['id']>;
}) {
  await db.mergePayees(targetId, mergeIds);
}

async function batchChangePayees({
  added,
  deleted,
  updated,
}: Partial<Diff<PayeeEntity>>): Promise<void> {
  await batchMessages(async () => {
    if (deleted) {
      await Promise.all(
        deleted.map(p => ({ id: p.id })).map(p => db.deletePayee(p)),
      );
    }

    if (added) {
      await Promise.all(
        added.map(p => payeeModel.toDb(p)).map(p => db.insertPayee(p)),
      );
    }

    if (updated) {
      await Promise.all(
        updated
          .map(p => payeeModel.toDb(p as PayeeEntity, { update: true }))
          .map(p => db.updatePayee(p)),
      );
    }
  });
}

async function checkOrphanedPayees({
  ids,
}: {
  ids: Array<PayeeEntity['id']>;
}): Promise<Array<PayeeEntity['id']>> {
  const orphaned = new Set(await db.getOrphanedPayees());
  return ids.filter(id => orphaned.has(id));
}

async function getPayeeRules({
  id,
}: {
  id: PayeeEntity['id'];
}): Promise<RuleEntity[]> {
  return rules.getRulesForPayee(id).map(rule => rule.serialize());
}

async function createPayeeLocation({
  payee_id,
  latitude,
  longitude,
}: {
  payee_id: PayeeEntity['id'];
  latitude: number;
  longitude: number;
}): Promise<PayeeLocationEntity['id']> {
  const created_at = Date.now();

  return await db.insertWithUUID('payee_locations', {
    payee_id,
    latitude,
    longitude,
    created_at,
  });
}

async function getPayeeLocations({
  payee_id,
}: {
  payee_id?: PayeeEntity['id'];
} = {}): Promise<PayeeLocationEntity[]> {
  let query = 'SELECT * FROM payee_locations WHERE tombstone IS NOT 1';
  let params: string[] = [];

  if (payee_id) {
    query += ' AND payee_id = ?';
    params = [payee_id];
  }

  query += ' ORDER BY created_at DESC';

  const results = await db.runQuery<PayeeLocationEntity>(query, params, true);
  return results || [];
}

async function deletePayeeLocation({
  id,
}: {
  id: PayeeLocationEntity['id'];
}): Promise<void> {
  await db.delete_('payee_locations', id);
}

// Type for the raw query result that combines PayeeEntity and PayeeLocationEntity fields
type NearbyPayeeQueryResult = Pick<
  PayeeEntity,
  | 'id'
  | 'name'
  | 'transfer_acct'
  | 'favorite'
  | 'learn_categories'
  | 'tombstone'
> &
  Omit<PayeeLocationEntity, 'id'> & {
    // PayeeLocationEntity's id renamed to location_id
    location_id: PayeeLocationEntity['id'];
    // Calculated distance from SQL
    distance: number;
  };
async function getNearbyPayees({
  latitude,
  longitude,
  maxDistance = DEFAULT_MAX_DISTANCE_METERS,
}: {
  latitude: number;
  longitude: number;
  maxDistance?: number;
}): Promise<Array<PayeeEntity>> {
  // Get the closest location for each payee within maxDistance using window functions
  const query = `
    WITH payee_distances AS (
      SELECT 
        pl.id as location_id,
        pl.payee_id,
        pl.latitude,
        pl.longitude,
        pl.created_at,
        p.id,
        p.name,
        p.transfer_acct,
        p.favorite,
        p.learn_categories,
        p.tombstone,
        -- Haversine formula to calculate distance
        ((6371 * acos(
          MIN(1, MAX(-1,
            cos(radians(?)) * cos(radians(pl.latitude)) * 
            cos(radians(pl.longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(pl.latitude))
          ))
        ))) * 1000 as distance,
        -- Rank locations by distance for each payee
        ROW_NUMBER() OVER (PARTITION BY pl.payee_id ORDER BY (
          (6371 * acos(
            MIN(1, MAX(-1,
              cos(radians(?)) * cos(radians(pl.latitude)) * 
              cos(radians(pl.longitude) - radians(?)) + 
              sin(radians(?)) * sin(radians(pl.latitude))
            ))
          )) * 1000
        )) as distance_rank
      FROM payee_locations pl
      JOIN payees p ON pl.payee_id = p.id
      WHERE p.tombstone IS NOT 1
        AND pl.tombstone IS NOT 1
        -- Filter by distance using Haversine formula
        AND (6371 * acos(
          MIN(1, MAX(-1,
            cos(radians(?)) * cos(radians(pl.latitude)) * 
            cos(radians(pl.longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(pl.latitude))
          ))
        )) * 1000 <= ?
    )
    SELECT 
      location_id,
      payee_id,
      latitude,
      longitude,
      created_at,
      id,
      name,
      transfer_acct,
      favorite,
      learn_categories,
      tombstone,
      distance
    FROM payee_distances
    WHERE distance_rank = 1
    ORDER BY distance ASC
    LIMIT 10
  `;

  const results = await db.runQuery<NearbyPayeeQueryResult>(
    query,
    [
      latitude,
      longitude,
      latitude, // For first distance calculation in SELECT
      latitude,
      longitude,
      latitude, // For ROW_NUMBER() ordering
      latitude,
      longitude,
      latitude, // For WHERE distance filter
      maxDistance,
    ],
    true,
  );

  // Transform results to expected format
  const nearbyPayees = results.map(row => ({
    // Payee properties
    id: row.id,
    name: row.name,
    transfer_acct: row.transfer_acct,
    favorite: row.favorite,
    learn_categories: row.learn_categories,
    tombstone: row.tombstone,
    // Location properties
    location: {
      id: row.location_id,
      payee_id: row.payee_id,
      latitude: row.latitude,
      longitude: row.longitude,
      created_at: row.created_at,
      // Calculated distance from SQL
      distance: row.distance,
    },
  }));

  return nearbyPayees;
}
