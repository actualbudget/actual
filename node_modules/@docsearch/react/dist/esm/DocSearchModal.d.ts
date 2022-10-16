import type { DocSearchProps } from './DocSearch';
import type { FooterTranslations } from './Footer';
import type { ScreenStateTranslations } from './ScreenState';
import type { SearchBoxTranslations } from './SearchBox';
export declare type ModalTranslations = Partial<{
    searchBox: SearchBoxTranslations;
    footer: FooterTranslations;
}> & ScreenStateTranslations;
export declare type DocSearchModalProps = DocSearchProps & {
    initialScrollY: number;
    onClose?: () => void;
    translations?: ModalTranslations;
};
export declare function DocSearchModal({ appId, apiKey, indexName, placeholder, searchParameters, onClose, transformItems, hitComponent, resultsFooterComponent, navigator, initialScrollY, transformSearchClient, disableUserPersonalization, initialQuery: initialQueryFromProp, translations, getMissingResultsUrl, }: DocSearchModalProps): JSX.Element;
