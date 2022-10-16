export type Schema = import("schema-utils/declarations/validate").Schema;
export type Compiler = import("webpack").Compiler;
export type Compilation = import("webpack").Compilation;
export type Chunk = import("webpack").Chunk;
export type Module = import("webpack").Module;
export type Source = import("webpack").sources.Source;
export type AssetInfo = import("webpack").AssetInfo;
export type NormalModule = import("webpack").NormalModule;
export type LoaderOptions = import("./index.js").LoaderOptions;
export type TODO = any;
export type Dependency = {
  identifier: string;
  context: string | null;
  content: Buffer;
  media: string;
  supports?: string | undefined;
  layer?: string | undefined;
  sourceMap?: Buffer | undefined;
};
/**
 * @this {import("webpack").LoaderContext<LoaderOptions>}
 * @param {string} request
 */
export function pitch(
  this: import("webpack").LoaderContext<MiniCssExtractPlugin.LoaderOptions>,
  request: string
): void;
import MiniCssExtractPlugin = require("./index");
declare function _default(): void;
export { _default as default };
