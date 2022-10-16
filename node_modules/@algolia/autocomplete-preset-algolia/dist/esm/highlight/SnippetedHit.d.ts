import { SnippetResult } from '@algolia/client-search';
export declare type SnippetedHit<THit> = THit & {
    _snippetResult?: SnippetResult<THit>;
};
