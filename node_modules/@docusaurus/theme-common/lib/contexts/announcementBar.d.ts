/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
export declare const AnnouncementBarDismissStorageKey = "docusaurus.announcement.dismiss";
declare type ContextValue = {
    /** Whether the announcement bar should be displayed. */
    readonly isActive: boolean;
    /**
     * Callback fired when the user closes the announcement. Will be saved.
     */
    readonly close: () => void;
};
export declare function AnnouncementBarProvider({ children, }: {
    children: ReactNode;
}): JSX.Element;
export declare function useAnnouncementBar(): ContextValue;
export {};
//# sourceMappingURL=announcementBar.d.ts.map