import { HoldingEntity } from 'loot-core/types/models/holding';
import * as db from '../db';
import { createApp } from '../app';

export type HoldingHandlers = {
  'holding-add': typeof addHolding;
  'holding-update': typeof updateHolding;
  'holding-delete': typeof deleteHolding;
};

export const app = createApp<HoldingHandlers>();
app.method('holding-add', addHolding);
app.method('holding-update', updateHolding);
app.method('holding-delete', deleteHolding);

async function addHolding(holding: HoldingEntity) {
  await db.insertHolding(holding);
}

async function updateHolding(holding: HoldingEntity) {
  await db.updateHolding(holding);
}

async function deleteHolding(holding: HoldingEntity) {
  await db.deleteHolding(holding);
}
