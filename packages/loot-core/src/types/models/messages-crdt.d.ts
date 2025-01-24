export type CrdtMessageEntity = {
  id: string;
  dataset: string;
  timestamp: string;
  column: string;
  row: string;
  value: Uint8Array;
};
