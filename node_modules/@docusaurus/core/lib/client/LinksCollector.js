/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useContext } from 'react';
export const createStatefulLinksCollector = () => {
    // Set to dedup, as it's not useful to collect multiple times the same link
    const allLinks = new Set();
    return {
        collectLink: (link) => {
            allLinks.add(link);
        },
        getCollectedLinks: () => [...allLinks],
    };
};
const Context = React.createContext({
    collectLink: () => {
        // No-op for client. We only use the broken links checker server-side.
    },
});
export const useLinksCollector = () => useContext(Context);
export function LinksCollectorProvider({ children, linksCollector, }) {
    return <Context.Provider value={linksCollector}>{children}</Context.Provider>;
}
