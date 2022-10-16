import type { DocSearchHit } from './DocSearchHit';
export declare type StoredDocSearchHit = Omit<DocSearchHit, '_highlightResult' | '_snippetResult'>;
