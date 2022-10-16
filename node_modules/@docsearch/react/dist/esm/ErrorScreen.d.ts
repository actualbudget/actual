export declare type ErrorScreenTranslations = Partial<{
    titleText: string;
    helpText: string;
}>;
declare type ErrorScreenProps = {
    translations?: ErrorScreenTranslations;
};
export declare function ErrorScreen({ translations }: ErrorScreenProps): JSX.Element;
export {};
