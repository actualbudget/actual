/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { PrismTheme } from 'prism-react-renderer';
import type { DeepPartial } from 'utility-types';
import type { MagicCommentConfig } from './codeBlockUtils';
export declare type DocsVersionPersistence = 'localStorage' | 'none';
export declare type NavbarItem = {
    type?: string | undefined;
    items?: NavbarItem[];
    label?: string;
    position?: 'left' | 'right';
} & {
    [key: string]: unknown;
};
declare type BaseLogo = {
    alt?: string;
    src: string;
    srcDark?: string;
    href?: string;
    width?: string | number;
    height?: string | number;
    target?: string;
    style?: object;
    className?: string;
};
export declare type NavbarLogo = BaseLogo;
export declare type Navbar = {
    style?: 'dark' | 'primary';
    hideOnScroll: boolean;
    title?: string;
    items: NavbarItem[];
    logo?: NavbarLogo;
};
export declare type ColorModeConfig = {
    defaultMode: 'light' | 'dark';
    disableSwitch: boolean;
    respectPrefersColorScheme: boolean;
};
export declare type AnnouncementBarConfig = {
    id: string;
    content: string;
    backgroundColor: string;
    textColor: string;
    isCloseable: boolean;
};
export declare type PrismConfig = {
    theme: PrismTheme;
    darkTheme?: PrismTheme;
    defaultLanguage?: string;
    additionalLanguages: string[];
    magicComments: MagicCommentConfig[];
};
export declare type FooterLinkItem = {
    label?: string;
    to?: string;
    href?: string;
    html?: string;
    prependBaseUrlToHref?: string;
} & {
    [key: string]: unknown;
};
export declare type FooterLogo = BaseLogo;
export declare type FooterBase = {
    style: 'light' | 'dark';
    logo?: FooterLogo;
    copyright?: string;
};
export declare type MultiColumnFooter = FooterBase & {
    links: {
        title: string | null;
        items: FooterLinkItem[];
    }[];
};
export declare type SimpleFooter = FooterBase & {
    links: FooterLinkItem[];
};
export declare type Footer = MultiColumnFooter | SimpleFooter;
export declare type TableOfContents = {
    minHeadingLevel: number;
    maxHeadingLevel: number;
};
export declare type ThemeConfig = {
    docs: {
        versionPersistence: DocsVersionPersistence;
        sidebar: {
            hideable: boolean;
            autoCollapseCategories: boolean;
        };
    };
    navbar: Navbar;
    colorMode: ColorModeConfig;
    announcementBar?: AnnouncementBarConfig;
    prism: PrismConfig;
    footer?: Footer;
    image?: string;
    metadata: {
        [key: string]: string;
    }[];
    tableOfContents: TableOfContents;
};
export declare type UserThemeConfig = DeepPartial<ThemeConfig>;
/**
 * A convenient/more semantic way to get theme config from context.
 */
export declare function useThemeConfig(): ThemeConfig;
export {};
//# sourceMappingURL=useThemeConfig.d.ts.map