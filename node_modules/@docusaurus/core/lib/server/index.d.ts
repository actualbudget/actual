/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext, Props } from '@docusaurus/types';
export declare type LoadContextOptions = {
    /** Usually the CWD; can be overridden with command argument. */
    siteDir: string;
    /** Custom output directory. Can be customized with `--out-dir` option */
    outDir?: string;
    /** Custom config path. Can be customized with `--config` option */
    config?: string;
    /** Default is `i18n.defaultLocale` */
    locale?: string;
    /**
     * `true` means the paths will have the locale prepended; `false` means they
     * won't (useful for `yarn build -l zh-Hans` where the output should be
     * emitted into `build/` instead of `build/zh-Hans/`); `undefined` is like the
     * "smart" option where only non-default locale paths are localized
     */
    localizePath?: boolean;
};
/**
 * Loading context is the very first step in site building. Its options are
 * directly acquired from CLI options. It mainly loads `siteConfig` and the i18n
 * context (which includes code translations). The `LoadContext` will be passed
 * to plugin constructors.
 */
export declare function loadContext(options: LoadContextOptions): Promise<LoadContext>;
/**
 * This is the crux of the Docusaurus server-side. It reads everything it needs—
 * code translations, config file, plugin modules... Plugins then use their
 * lifecycles to generate content and other data. It is side-effect-ful because
 * it generates temp files in the `.docusaurus` folder for the bundler.
 */
export declare function load(options: LoadContextOptions): Promise<Props>;
