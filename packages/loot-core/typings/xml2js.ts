// xml2js ships no types; this covers the parts loot-core uses.
declare module 'xml2js' {
  export type ParserOptions = {
    explicitArray?: boolean;
    explicitCharkey?: boolean;
    trim?: boolean;
    emptyTag?: () => unknown;
    tagNameProcessors?: Array<(name: string) => string>;
    attrNameProcessors?: Array<(name: string) => string>;
  };
  export function parseStringPromise<T = object>(
    xml: string,
    options?: ParserOptions,
  ): Promise<T>;
  export const processors: { stripPrefix: (name: string) => string };
}
