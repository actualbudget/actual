import { HighlightResult } from '@algolia/client-search';
export declare type HighlightedHit<THit> = THit & {
    _highlightResult?: HighlightResult<THit>;
};
