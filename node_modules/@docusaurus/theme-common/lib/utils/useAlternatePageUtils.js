/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';
/**
 * Permits to obtain the url of the current page in another locale, useful to
 * generate hreflang meta headers etc...
 *
 * @see https://developers.google.com/search/docs/advanced/crawling/localized-versions
 */
export function useAlternatePageUtils() {
    const { siteConfig: { baseUrl, url }, i18n: { defaultLocale, currentLocale }, } = useDocusaurusContext();
    const { pathname } = useLocation();
    const baseUrlUnlocalized = currentLocale === defaultLocale
        ? baseUrl
        : baseUrl.replace(`/${currentLocale}/`, '/');
    const pathnameSuffix = pathname.replace(baseUrl, '');
    function getLocalizedBaseUrl(locale) {
        return locale === defaultLocale
            ? `${baseUrlUnlocalized}`
            : `${baseUrlUnlocalized}${locale}/`;
    }
    // TODO support correct alternate url when localized site is deployed on
    // another domain
    function createUrl({ locale, fullyQualified, }) {
        return `${fullyQualified ? url : ''}${getLocalizedBaseUrl(locale)}${pathnameSuffix}`;
    }
    return { createUrl };
}
//# sourceMappingURL=useAlternatePageUtils.js.map