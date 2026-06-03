import type { Query } from '@actual-app/core/shared/query';
import type {
  Binding as SharedBinding,
  BindingObject as SharedBindingObject,
  SheetFields,
  SheetNames,
} from '@actual-app/shared-types/spreadsheet';

export { parametrizedField } from '@actual-app/shared-types/spreadsheet';
export type {
  SheetFields,
  SheetNames,
  Spreadsheets,
} from '@actual-app/shared-types/spreadsheet';

export type BindingObject<
  SheetName extends SheetNames,
  SheetFieldName extends SheetFields<SheetName>,
> = SharedBindingObject<SheetName, SheetFieldName, Query>;

export type Binding<
  SheetName extends SheetNames,
  SheetFieldName extends SheetFields<SheetName>,
> = SharedBinding<SheetName, SheetFieldName, Query>;
