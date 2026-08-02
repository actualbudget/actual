import type { MenuItem } from '@actual-app/components/menu';

export type ContextMenuItem =
  | (Extract<MenuItem, object> & {
      hidden?: boolean;
      order?: number;
      onClick?: () => void;
    })
  | Extract<MenuItem, symbol>;
