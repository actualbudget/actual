import type { AutocompleteApi } from '@algolia/autocomplete-core';
interface UseTouchEventsProps {
    getEnvironmentProps: AutocompleteApi<any>['getEnvironmentProps'];
    panelElement: HTMLDivElement | null;
    formElement: HTMLDivElement | null;
    inputElement: HTMLInputElement | null;
}
export declare function useTouchEvents({ getEnvironmentProps, panelElement, formElement, inputElement, }: UseTouchEventsProps): void;
export {};
