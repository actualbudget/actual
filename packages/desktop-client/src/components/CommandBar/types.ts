import type { ComponentType, ReactNode, SVGProps } from 'react';

/**
 * One row in the command bar. This is also the shape a future user-defined
 * plugin item would need to satisfy to appear alongside the built-in ones —
 * keep it dependency-free (no direct dispatch/navigate calls baked in here).
 */
export type SearchableItem = {
  id: string;
  /** The name to display and use for searching */
  name: string;
  /**
   * The item content to display. If not provided, {@link SearchableItem.name `name`} will be used.
   *
   * Meant for complex items that want to display more than just static text.
   */
  content?: ReactNode;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Custom leading element; takes precedence over {@link SearchableItem.Icon `Icon`} */
  leading?: ReactNode;
};

export type SearchSection = {
  key: string;
  heading: string;
  items: Readonly<SearchableItem[]>;
  onSelect: (item: Pick<SearchableItem, 'id'>) => void;
};

/** A quick action additionally carries the effect it runs on selection. */
export type QuickAction = SearchableItem & {
  run: () => void;
  /** Skip the default close-on-select behavior. */
  keepOpen?: boolean;
};
