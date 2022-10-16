"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const url_1 = tslib_1.__importDefault(require("url"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const util_1 = require("util");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const unist_util_visit_1 = tslib_1.__importDefault(require("unist-util-visit"));
const escape_html_1 = tslib_1.__importDefault(require("escape-html"));
const image_size_1 = tslib_1.__importDefault(require("image-size"));
const { loaders: { inlineMarkdownImageFileLoader }, } = (0, utils_1.getFileLoaderUtils)();
async function toImageRequireNode([node, index, parent], imagePath, filePath) {
    let relativeImagePath = (0, utils_1.posixPath)(path_1.default.relative(path_1.default.dirname(filePath), imagePath));
    relativeImagePath = `./${relativeImagePath}`;
    const parsedUrl = url_1.default.parse(node.url);
    const hash = parsedUrl.hash ?? '';
    const search = parsedUrl.search ?? '';
    const alt = node.alt ? `alt={"${(0, escape_html_1.default)(node.alt)}"} ` : '';
    const src = `require("${inlineMarkdownImageFileLoader}${(0, utils_1.escapePath)(relativeImagePath) + search}").default${hash ? ` + '${hash}'` : ''}`;
    const title = node.title ? ` title="${(0, escape_html_1.default)(node.title)}"` : '';
    let width = '';
    let height = '';
    try {
        const size = (await (0, util_1.promisify)(image_size_1.default)(imagePath));
        if (size.width) {
            width = ` width="${size.width}"`;
        }
        if (size.height) {
            height = ` height="${size.height}"`;
        }
    }
    catch (err) {
        // Workaround for https://github.com/yarnpkg/berry/pull/3889#issuecomment-1034469784
        // TODO remove this check once fixed in Yarn PnP
        if (!process.versions.pnp) {
            logger_1.default.warn `The image at path=${imagePath} can't be read correctly. Please ensure it's a valid image.
${err.message}`;
        }
    }
    const jsxNode = {
        type: 'jsx',
        value: `<img ${alt}src={${src}}${title}${width}${height} />`,
    };
    parent.children.splice(index, 1, jsxNode);
}
async function ensureImageFileExist(imagePath, sourceFilePath) {
    const imageExists = await fs_extra_1.default.pathExists(imagePath);
    if (!imageExists) {
        throw new Error(`Image ${(0, utils_1.toMessageRelativeFilePath)(imagePath)} used in ${(0, utils_1.toMessageRelativeFilePath)(sourceFilePath)} not found.`);
    }
}
async function getImageAbsolutePath(imagePath, { siteDir, filePath, staticDirs }) {
    if (imagePath.startsWith('@site/')) {
        const imageFilePath = path_1.default.join(siteDir, imagePath.replace('@site/', ''));
        await ensureImageFileExist(imageFilePath, filePath);
        return imageFilePath;
    }
    else if (path_1.default.isAbsolute(imagePath)) {
        // Absolute paths are expected to exist in the static folder.
        const possiblePaths = staticDirs.map((dir) => path_1.default.join(dir, imagePath));
        const imageFilePath = await (0, utils_1.findAsyncSequential)(possiblePaths, fs_extra_1.default.pathExists);
        if (!imageFilePath) {
            throw new Error(`Image ${possiblePaths
                .map((p) => (0, utils_1.toMessageRelativeFilePath)(p))
                .join(' or ')} used in ${(0, utils_1.toMessageRelativeFilePath)(filePath)} not found.`);
        }
        return imageFilePath;
    }
    // Relative paths are resolved against the source file's folder.
    const imageFilePath = path_1.default.join(path_1.default.dirname(filePath), decodeURIComponent(imagePath));
    await ensureImageFileExist(imageFilePath, filePath);
    return imageFilePath;
}
async function processImageNode(target, context) {
    const [node] = target;
    if (!node.url) {
        throw new Error(`Markdown image URL is mandatory in "${(0, utils_1.toMessageRelativeFilePath)(context.filePath)}" file`);
    }
    const parsedUrl = url_1.default.parse(node.url);
    if (parsedUrl.protocol || !parsedUrl.pathname) {
        // pathname:// is an escape hatch, in case user does not want her images to
        // be converted to require calls going through webpack loader
        if (parsedUrl.protocol === 'pathname:') {
            node.url = node.url.replace('pathname://', '');
        }
        return;
    }
    // We try to convert image urls without protocol to images with require calls
    // going through webpack ensures that image assets exist at build time
    const imagePath = await getImageAbsolutePath(parsedUrl.pathname, context);
    await toImageRequireNode(target, imagePath, context.filePath);
}
function plugin(options) {
    return async (root, vfile) => {
        const promises = [];
        (0, unist_util_visit_1.default)(root, 'image', (node, index, parent) => {
            promises.push(processImageNode([node, index, parent], {
                ...options,
                filePath: vfile.path,
            }));
        });
        await Promise.all(promises);
    };
}
exports.default = plugin;
//# sourceMappingURL=index.js.map