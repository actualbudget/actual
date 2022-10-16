import type { ScreenStateProps } from './ScreenState';
import type { InternalDocSearchHit } from './types';
export declare type StartScreenTranslations = Partial<{
    recentSearchesTitle: string;
    noRecentSearchesText: string;
    saveRecentSearchButtonTitle: string;
    removeRecentSearchButtonTitle: string;
    favoriteSearchesTitle: string;
    removeFavoriteSearchButtonTitle: string;
}>;
declare type StartScreenProps = Omit<ScreenStateProps<InternalDocSearchHit>, 'translations'> & {
    hasCollections: boolean;
    translations?: StartScreenTranslations;
};
export declare function StartScreen({ translations, ...props }: StartScreenProps): JSX.Element | null;
export {};
