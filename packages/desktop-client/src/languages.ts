export const languages = import.meta.glob([
  '/locale/*.json',
  '!/locale/*_old.json',
]);
