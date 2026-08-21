import type { ComponentType, ReactNode, SVGProps } from 'react';

/** One renderer row in the command bar. */
export type SearchableItem = Readonly<{
  readonly id: string;
  /** The name to display and use for searching */
  readonly name: string;
  /**
   * The item content to display. If not provided, {@link SearchableItem.name `name`} will be used.
   *
   * Meant for complex items that want to display more than just static text.
   */
  readonly content?: ReactNode;
  readonly Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Custom leading element; takes precedence over {@link SearchableItem.Icon `Icon`} */
  readonly leading?: ReactNode;
}>;

export type SearchSection = Readonly<{
  readonly key: string;
  readonly heading: string;
  readonly items: readonly SearchableItem[];
  readonly onSelect: (item: Pick<SearchableItem, 'id'>) => void;
}>;

/** A quick action additionally carries the effect it runs on selection. */
export type QuickAction = SearchableItem &
  Readonly<{
    readonly run: () => void | Promise<void>;
    /** Skip the default close-on-select behavior. */
    readonly keepOpen?: boolean;
  }>;

/** An action shown for a resolved item on a nested action page. */
export type ActionExecution = Readonly<{
  label: string;
  run: () => void | Promise<void>;
}>;

export type ActionItem = SearchableItem &
  Readonly<{
    readonly description?: ReactNode;
    readonly shortcut?: readonly string[];
    readonly destructive?: boolean;
    readonly primaryAction: ActionExecution;
    readonly secondaryAction?: ActionExecution;
  }>;

export type ActionTrigger = 'primary' | 'secondary';

export type ActionSection = Readonly<{
  readonly key: string;
  readonly heading: string;
  readonly items: readonly ActionItem[];
}>;

export type ActionPageHeader = Readonly<{
  readonly name: string;
  readonly typeLabel: string;
  readonly Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  readonly leading?: ReactNode;
  readonly secondary?: ReactNode;
}>;

export type ShortcutHint = Readonly<{
  readonly keys: readonly string[];
  readonly label: string;
}>;
