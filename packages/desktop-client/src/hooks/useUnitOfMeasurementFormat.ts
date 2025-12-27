import { useSyncedPref } from './useSyncedPref';

export function useUnitOfMeasurementFormat() {
  const [unitOfMeasurementFormat] = useSyncedPref('unitOfMeasurementFormat');
  return unitOfMeasurementFormat || 'imperial';
}
