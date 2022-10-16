import React from 'react';
export declare type ButtonTranslations = Partial<{
    buttonText: string;
    buttonAriaLabel: string;
}>;
export declare type DocSearchButtonProps = React.ComponentProps<'button'> & {
    translations?: ButtonTranslations;
};
export declare const DocSearchButton: React.ForwardRefExoticComponent<Pick<DocSearchButtonProps, "translations" | "key" | keyof React.ButtonHTMLAttributes<HTMLButtonElement>> & React.RefAttributes<HTMLButtonElement>>;
