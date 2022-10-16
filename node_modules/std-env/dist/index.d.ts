declare type ProviderName = '' | 'appveyor' | 'azure_pipelines' | 'azure_static' | 'appcircle' | 'bamboo' | 'bitbucket' | 'bitrise' | 'buddy' | 'buildkite' | 'circle' | 'cirrus' | 'cloudflare_pages' | 'codebuild' | 'codefresh' | 'drone' | 'drone' | 'dsari' | 'github_actions' | 'gitlab' | 'gocd' | 'layerci' | 'hudson' | 'jenkins' | 'magnum' | 'netlify' | 'nevercode' | 'render' | 'sail' | 'semaphore' | 'screwdriver' | 'shippable' | 'solano' | 'strider' | 'teamcity' | 'travis' | 'vercel' | 'appcenter' | 'codesandbox' | 'stackblitz' | 'stormkit';
declare type ProviderInfo = {
    name: ProviderName;
    [meta: string]: any;
};

/** Value of process.platform */
declare const platform: NodeJS.Platform;
/** Current provider name */
declare const provider: ProviderName;
/** Detect if `CI` environment variable is set or a provider CI detected */
declare const isCI: boolean;
/** Detect if stdout.TTY is available */
declare const hasTTY: boolean;
/** Detect if global `window` object is available */
declare const hasWindow: boolean;
/** Detect if `DEBUG` environment variable is set */
declare const isDebug: boolean;
/** Detect if `NODE_ENV` environment variable is `test` */
declare const isTest: boolean;
/** Detect if `NODE_ENV` environment variable is `production` */
declare const isProduction: boolean;
/** Detect if `NODE_ENV` environment variable is `dev` or `development` */
declare const isDevelopment: boolean;
/** Detect if MINIMAL environment variable is set, running in CI or test or TTY is unavailable */
declare const isMinimal: boolean;
/** Detect if process.platform is Windows */
declare const isWindows: boolean;
/** Detect if process.platform is Linux */
declare const isLinux: boolean;
/** Detect if process.platform is macOS (darwin kernel) */
declare const isMacOS: boolean;

export { ProviderInfo, ProviderName, hasTTY, hasWindow, isCI, isDebug, isDevelopment, isLinux, isMacOS, isMinimal, isProduction, isTest, isWindows, platform, provider };
