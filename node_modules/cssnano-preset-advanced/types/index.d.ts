export = advancedPreset;
declare function advancedPreset(opts?: {}): {
    plugins: [import("postcss").PluginCreator<any>, boolean | Record<string, any> | undefined][];
};
declare namespace advancedPreset {
    export { AdvancedOptions, Options };
}
type AdvancedOptions = {
    autoprefixer?: autoprefixer.Options;
    discardUnused?: false | import('postcss-discard-unused').Options & {
        exclude?: true;
    };
    mergeIdents?: false | {
        exclude?: true;
    };
    reduceIdents?: false | import('postcss-reduce-idents').Options & {
        exclude?: true;
    };
    zindex?: false | import('postcss-zindex').Options & {
        exclude?: true;
    };
};
type Options = import('cssnano-preset-default').Options & AdvancedOptions;
import autoprefixer = require("autoprefixer");
