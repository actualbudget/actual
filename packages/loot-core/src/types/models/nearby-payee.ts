import type { PayeeEntity } from './payee';
import type { PayeeLocationEntity } from './payee-location';

export type NearbyPayeeEntity = {
  payee: PayeeEntity;
  location: PayeeLocationEntity;
};
