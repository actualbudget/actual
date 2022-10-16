import type { ScreenStateProps } from './ScreenState';
import type { InternalDocSearchHit } from './types';
declare type ResultsScreenProps = Omit<ScreenStateProps<InternalDocSearchHit>, 'translations'>;
export declare function ResultsScreen(props: ResultsScreenProps): JSX.Element;
export {};
