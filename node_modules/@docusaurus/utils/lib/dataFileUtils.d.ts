/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ContentPaths } from './markdownLinks';
declare type DataFileParams = {
    /** Path to the potential data file, relative to `contentPaths` */
    filePath: string;
    /**
     * Includes the base path and localized path, both of which are eligible for
     * sourcing data files. Both paths should be absolute.
     */
    contentPaths: ContentPaths;
};
/**
 * Looks for a data file in the potential content paths; loads a localized data
 * file in priority.
 *
 * @returns An absolute path to the data file, or `undefined` if there isn't one.
 */
export declare function getDataFilePath({ filePath, contentPaths, }: DataFileParams): Promise<string | undefined>;
/**
 * Looks up for a data file in the content paths, returns the object validated
 * and normalized according to the `validate` callback.
 *
 * @returns `undefined` when file not found
 * @throws Throws when validation fails, displaying a helpful context message.
 */
export declare function getDataFileData<T>(params: DataFileParams & {
    /** Used for the "The X file looks invalid" message. */
    fileType: string;
}, validate: (content: unknown) => T): Promise<T | undefined>;
/**
 * Takes the `contentPaths` data structure and returns an ordered path list
 * indicating their priorities. For all data, we look in the localized folder
 * in priority.
 */
export declare function getContentPathList(contentPaths: ContentPaths): string[];
/**
 * @param folderPaths a list of absolute paths.
 * @param relativeFilePath file path relative to each `folderPaths`.
 * @returns the first folder path in which the file exists, or `undefined` if
 * none is found.
 */
export declare function findFolderContainingFile(folderPaths: string[], relativeFilePath: string): Promise<string | undefined>;
/**
 * Fail-fast alternative to `findFolderContainingFile`.
 *
 * @param folderPaths a list of absolute paths.
 * @param relativeFilePath file path relative to each `folderPaths`.
 * @returns the first folder path in which the file exists.
 * @throws Throws if no file can be found. You should use this method only when
 * you actually know the file exists (e.g. when the `relativeFilePath` is read
 * with a glob and you are just trying to localize it)
 */
export declare function getFolderContainingFile(folderPaths: string[], relativeFilePath: string): Promise<string>;
export {};
//# sourceMappingURL=dataFileUtils.d.ts.map