import { AutocompletePropGetters } from './AutocompletePropGetters';
import { AutocompleteSetters } from './AutocompleteSetters';
export declare type BaseItem = Record<string, unknown>;
export interface AutocompleteScopeApi<TItem extends BaseItem> extends AutocompleteSetters<TItem> {
    /**
     * Triggers a search to refresh the state.
     */
    refresh(): Promise<void>;
}
export declare type AutocompleteApi<TItem extends BaseItem, TEvent = Event, TMouseEvent = MouseEvent, TKeyboardEvent = KeyboardEvent> = AutocompleteScopeApi<TItem> & AutocompletePropGetters<TItem, TEvent, TMouseEvent, TKeyboardEvent>;
