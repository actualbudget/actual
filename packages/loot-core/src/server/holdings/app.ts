import { HoldingHandlers } from '.';
import { createApp } from '../app';

export const app = createApp<HoldingHandlers>();
app.method('holding-add');

async function addHolding(holding: HoldingEntity) {
  await db.insertHolding(holding);
}

async function updateHolding(holding: HoldingEntity) {
  await db.updateHolding(holding);
}

async function deleteHolding(holding: HoldingEntity) {
  await db.deleteHolding(holding);
}
