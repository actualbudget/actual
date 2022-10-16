/// <reference types="react" />
import type { StoredDocSearchHit } from './types';
interface SnippetProps<TItem> {
    hit: TItem;
    attribute: string;
    tagName?: string;
    [prop: string]: unknown;
}
export declare function Snippet<TItem extends StoredDocSearchHit>({ hit, attribute, tagName, ...rest }: SnippetProps<TItem>): import("react").DOMElement<{
    dangerouslySetInnerHTML: {
        __html: any;
    };
}, Element>;
export {};
