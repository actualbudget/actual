import { createApp } from '#server/app';
import * as db from '#server/db';
import { payeeModel } from '#server/models';
import { mutator } from '#server/mutators';
import { getCompletedScheduleRuleIds } from '#server/schedules/app';
import { batchMessages } from '#server/sync';
import { isForeignAccount } from '#server/transactions/foreign-guard';
import * as rules from '#server/transactions/transaction-rules';
import { undoable } from '#server/undo';
import { DEFAULT_MAX_DISTANCE_METERS } from '#shared/constants';
import type { Diff } from '#shared/util';
import type {
  NearbyPayeeEntity,
  PayeeEntity,
  PayeeLocationEntity,
  RuleEntity,
} from '#types/models';

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
  return (await db.getCommonPayees()).map(p => payeeModel.fromDb(p));
}

async function getPayees(): Promise<PayeeEntity[]> {
  // TODO: Update to an AQL query. Server must return AQL entities not the raw DB data.
  return (await db.getPayees()).map(p => payeeModel.fromDb(p));
}

async function getOrphanedPayees(): Promise<Array<Pick<PayeeEntity, 'id'>>> {
  return await db.syncGetOrphanedPayees();
}

async function getPayeeRuleCounts() {
  const payeeCounts: Record<PayeeEntity['id'], number> = {};
  const completedScheduleRules = new Set(await getCompletedScheduleRuleIds());

  rules.iterateIds(rules.getRules(), 'payee', (rule, id) => {
    if (rule.id && completedScheduleRules.has(rule.id)) {
      return;
    }

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
  // Merging into a transfer payee would turn foreign transactions into
  // transfers without a transaction write.
  const target = await db.first<Pick<db.DbPayee, 'transfer_acct'>>(
    'SELECT transfer_acct FROM payees WHERE id = ?',
    [targetId],
  );
  if (target?.transfer_acct) {
    for (const id of mergeIds) {
      if (
        (await isPayeeUsedByForeignTransaction(id)) ||
        (await isForeignAccount(target.transfer_acct))
      ) {
        throw new Error('multicurrency-transfer-unavailable');
      }
    }
  }
  await db.mergePayees(targetId, mergeIds);
}

async function batchChangePayees({
  added,
  deleted,
  updated,
}: Partial<Diff<PayeeEntity>>): Promise<void> {
  await rejectForeignTransferTargetChanges([
    ...(added ?? []),
    ...(updated ?? []),
  ]);
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

// Transactions keep raw payee ids; merged payees resolve through mappings.
// Tombstoned rows count because undo can restore them.
async function isPayeeUsedByForeignTransaction(payeeId: string) {
  return Boolean(
    await db.first(
      `SELECT 1 FROM transactions t
         JOIN accounts a ON a.id = t.acct
         LEFT JOIN payee_mapping pm ON pm.id = t.description
         WHERE COALESCE(pm.targetId, t.description) = ?
           AND a.currency IS NOT NULL
         LIMIT 1`,
      [payeeId],
    ),
  );
}

// Turning a payee into (or out of) a transfer payee would create or break a
// transfer without a transaction write, so it is checked here.
async function rejectForeignTransferTargetChanges(
  payees: Array<Partial<PayeeEntity>>,
) {
  for (const payee of payees) {
    if (!('transfer_acct' in payee) || !payee.id) continue;
    const existing = await db.first<Pick<db.DbPayee, 'transfer_acct'>>(
      'SELECT transfer_acct FROM payees WHERE id = ?',
      [payee.id],
    );
    const previous = existing?.transfer_acct ?? null;
    const next = payee.transfer_acct ?? null;
    if (previous === next) continue;
    const usedByForeign = await isPayeeUsedByForeignTransaction(payee.id);
    if (
      usedByForeign ||
      (previous && (await isForeignAccount(previous))) ||
      (next && (await isForeignAccount(next)))
    ) {
      throw new Error('multicurrency-transfer-unavailable');
    }
  }
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
  payeeId,
  latitude,
  longitude,
}: {
  payeeId: PayeeEntity['id'];
  latitude: number;
  longitude: number;
}): Promise<PayeeLocationEntity['id']> {
  const created_at = Date.now();

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      'Invalid coordinates: latitude must be between -90 and 90, longitude must be between -180 and 180',
    );
  }

  return await db.insertWithUUID('payee_locations', {
    payee_id: payeeId,
    latitude,
    longitude,
    created_at,
  });
}

async function getPayeeLocations({
  payeeId,
}: {
  payeeId?: PayeeEntity['id'];
} = {}): Promise<PayeeLocationEntity[]> {
  let query = 'SELECT * FROM payee_locations WHERE tombstone IS NOT 1';
  let params: string[] = [];

  if (payeeId) {
    query += ' AND payee_id = ?';
    params = [payeeId];
  }

  query += ' ORDER BY created_at DESC';

  return db.runQuery<PayeeLocationEntity>(query, params, true);
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
  db.DbPayee,
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
}): Promise<NearbyPayeeEntity[]> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      'Invalid coordinates: latitude must be between -90 and 90, longitude must be between -180 and 180',
    );
  }

  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    throw new Error(
      'Invalid maxDistance: must be a finite positive number greater than 0',
    );
  }

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

  const results = db.runQuery<NearbyPayeeQueryResult>(
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
  const nearbyPayees: NearbyPayeeEntity[] = results.map(row => {
    const payee = payeeModel.fromDb({
      id: row.id,
      name: row.name,
      transfer_acct: row.transfer_acct,
      favorite: row.favorite,
      learn_categories: row.learn_categories,
      tombstone: row.tombstone,
    });

    return {
      payee,
      location: {
        id: row.location_id,
        payee_id: row.payee_id,
        latitude: row.latitude,
        longitude: row.longitude,
        created_at: row.created_at,
        distance: row.distance,
      },
    };
  });

  return nearbyPayees;
}
