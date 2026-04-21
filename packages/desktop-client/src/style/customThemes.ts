/**
 * Custom theme utilities: fetch, validation, and storage helpers.
 */

export const BASE_THEME_OPTIONS = ['light', 'dark', 'midnight'] as const;
export type BaseTheme = (typeof BASE_THEME_OPTIONS)[number];

export type CatalogTheme = {
  name: string;
  repo: string;
  colors?: string[];
  mode: 'dark' | 'light';
};

export type InstalledTheme = {
  id: string;
  name: string;
  repo: string;
  cssContent: string; // CSS content stored when theme is installed (required)
  baseTheme?: BaseTheme; // Which built-in theme to use as base (defaults to contextual theme)
};

/**
 * Safely extract the owner from a GitHub repo string.
 * Handles malformed repo strings by returning "Unknown" when owner cannot be determined.
 */
export function extractRepoOwner(repo: string): string {
  if (!repo || typeof repo !== 'string' || !repo.includes('/')) {
    return 'Unknown';
  }
  const parts = repo.split('/');
  const owner = parts[0]?.trim();
  return owner || 'Unknown';
}

/**
 * Normalize a GitHub repo identifier to a full GitHub URL.
 * Accepts "owner/repo" format.
 * Returns "https://github.com/owner/repo".
 * @throws {Error} If repo is invalid or missing owner/repo.
 */
export function normalizeGitHubRepo(repo: string): string {
  const trimmed = repo.trim();
  if (!trimmed.includes('/')) {
    throw new Error('Invalid repo: must be in "owner/repo" format');
  }

  const parts = trimmed.split('/');
  const owner = parts[0]?.trim();
  const repoName = parts[1]?.trim();

  if (!owner || !repoName) {
    throw new Error('Invalid repo: must include both owner and repo name');
  }

  return `https://github.com/${owner}/${repoName}`;
}

/**
 * Try fetching actual.css from main branch.
 */
export function fetchThemeCss(repo: string): Promise<string> {
  return fetchDirectCss(
    `https://raw.githubusercontent.com/${repo}/refs/heads/main/actual.css`,
  );
}

/**
 * Fetch CSS from a direct URL (not a GitHub repo).
 */
export async function fetchDirectCss(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch CSS from ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

/** Strip surrounding single or double quotes from a string. */
function stripQuotes(s: string): string {
  const t = s.trim();
  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/**
 * Validate a font-family value for a --font-* CSS variable.
 *
 * Any font name is allowed — referencing a font the user doesn't have
 * installed simply triggers the browser's normal fallback behaviour
 * (no network requests). The only things we block are function calls
 * (url(), expression(), etc.) because those could load external resources
 * or execute expressions.
 *
 * Quoted or unquoted font names are both accepted.
 *
 * Examples of accepted values:
 *   Georgia, serif
 *   'Fira Code', monospace
 *   "My Theme Font", sans-serif
 */
function validateFontFamilyValue(value: string, property: string): void {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(
      `Invalid font-family value for "${property}": value must not be empty.`,
    );
  }

  // Split on commas, then validate each font name
  const families = trimmed.split(',');

  for (const raw of families) {
    const name = stripQuotes(raw);

    if (!name) {
      throw new Error(
        `Invalid font-family value for "${property}": empty font name in comma-separated list.`,
      );
    }

    // Reject anything that looks like a function call (url(), expression(), etc.)
    if (/\(/.test(name)) {
      throw new Error(
        `Invalid font-family value for "${property}": function calls are not allowed. Only font names are permitted.`,
      );
    }
  }
}

/** Only var(--custom-property-name) is allowed; no fallbacks. Variable name: -- then [a-zA-Z0-9_-]+ (no trailing dash). */
const VAR_ONLY_PATTERN = /^var\s*\(\s*(--[a-zA-Z0-9_-]+)\s*\)$/i;

function isValidSimpleVarValue(value: string): boolean {
  const m = value.trim().match(VAR_ONLY_PATTERN);
  if (!m) return false;
  const name = m[1];
  return name !== '--' && !name.endsWith('-');
}

/**
 * Validate that a CSS property value only contains allowed content (allowlist approach).
 * Allows: colors (hex, rgb/rgba, hsl/hsla), lengths, numbers, keywords, and var(--name) only (no fallbacks).
 * Font properties (--font-*) are validated against a safe font family allowlist instead.
 */
function validatePropertyValue(value: string, property: string): void {
  // Font properties use a dedicated validator that accepts any font name
  // but rejects function calls (url(), expression(), etc.).
  if (/^--font-/i.test(property)) {
    validateFontFamilyValue(value, property);
    return;
  }
  if (!value || value.length === 0) {
    return; // Empty values are allowed
  }

  const trimmedValue = value.trim();

  if (isValidSimpleVarValue(trimmedValue)) {
    return;
  }

  // Allowlist: Only allow specific safe CSS value patterns
  // 1. Hex colors: #RGB, #RRGGBB, or #RRGGBBAA (3, 6, or 8 hex digits)
  const hexColorPattern = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/;

  // 2. RGB/RGBA functions: rgb(...) or rgba(...) with simple numeric/percentage values
  const rgbRgbaPattern =
    /^rgba?\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*(,\s*[\d.]+)?\s*\)$/;

  // 3. HSL/HSLA functions: hsl(...) or hsla(...) with simple numeric/percentage values
  const hslHslaPattern =
    /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/;

  // 4. Length values with units: number (including decimals) followed by valid CSS unit
  const lengthPattern =
    /^(\d+\.?\d*|\d*\.\d+)(px|em|rem|%|vh|vw|vmin|vmax|cm|mm|in|pt|pc|ex|ch)$/;

  // 5. Unitless numbers (integers or decimals)
  const numberPattern = /^(\d+\.?\d*|\d*\.\d+)$/;

  // 6. CSS keywords: common safe keywords
  const keywordPattern =
    /^(inherit|initial|unset|revert|transparent|none|auto|normal)$/i;

  // Check if value matches any allowed pattern
  if (
    hexColorPattern.test(trimmedValue) ||
    rgbRgbaPattern.test(trimmedValue) ||
    hslHslaPattern.test(trimmedValue) ||
    lengthPattern.test(trimmedValue) ||
    numberPattern.test(trimmedValue) ||
    keywordPattern.test(trimmedValue)
  ) {
    return; // Value is allowed
  }

  // If none of the allowlist patterns match, reject the value
  throw new Error(
    `Invalid value "${trimmedValue}" for property "${property}". Only simple CSS values are allowed (colors, lengths, numbers, keywords, or var(--name)). Other functions, URLs, and complex constructs are not permitted.`,
  );
}

// ─── @font-face validation ──────────────────────────────────────────────────

/** Maximum size of a single base64-encoded font (bytes of decoded data). 2 MB. */
export const MAX_FONT_FILE_SIZE = 2 * 1024 * 1024;

/** Maximum total size of all embedded font data across all @font-face blocks. 10 MB. */
export const MAX_TOTAL_FONT_SIZE = 10 * 1024 * 1024;

/**
 * Extract @font-face blocks from CSS. Returns the blocks and the remaining CSS.
 * Only matches top-level @font-face blocks (not nested inside other rules).
 */
function extractFontFaceBlocks(css: string): {
  fontFaceBlocks: string[];
  remaining: string;
} {
  const fontFaceBlocks: string[] = [];
  let remaining = css;

  // Extract @font-face { ... } blocks one at a time using indexOf-based
  // parsing. Each iteration removes the matched block from `remaining`.
  for (;;) {
    const atIdx = remaining.indexOf('@font-face');
    if (atIdx === -1) break;

    const openBrace = remaining.indexOf('{', atIdx);
    if (openBrace === -1) break;

    const closeBrace = remaining.indexOf('}', openBrace + 1);
    if (closeBrace === -1) break;

    fontFaceBlocks.push(remaining.substring(openBrace + 1, closeBrace).trim());
    remaining =
      remaining.substring(0, atIdx) + remaining.substring(closeBrace + 1);
  }

  return { fontFaceBlocks, remaining: remaining.trim() };
}

/**
 * Validate @font-face blocks: only data: URIs allowed (no remote URLs).
 * Enforces size limits to prevent DoS.
 */
function validateFontFaceBlocks(fontFaceBlocks: string[]): void {
  let totalSize = 0;
  // Match url() with quoted or unquoted content. Quoted URLs use a non-greedy
  // match up to the closing quote; unquoted URLs match non-whitespace/non-paren.
  const urlRegex = /url\(\s*(?:'([^']*)'|"([^"]*)"|([^'")\s]+))\s*\)/g;

  for (const block of fontFaceBlocks) {
    urlRegex.lastIndex = 0;
    let match;
    while ((match = urlRegex.exec(block)) !== null) {
      const uri = (match[1] ?? match[2] ?? match[3]).trim();
      if (!uri.startsWith('data:')) {
        throw new Error(
          'Invalid font src: only data: URIs are allowed in @font-face. ' +
            'Remote URLs (http/https) are not permitted to protect user privacy. ' +
            'Font files are automatically embedded when installing from GitHub.',
        );
      }
      // Estimate decoded size from base64 content
      const base64Match = uri.match(/;base64,(.+)$/);
      if (base64Match) {
        const size = Math.ceil((base64Match[1].length * 3) / 4);
        if (size > MAX_FONT_FILE_SIZE) {
          throw new Error(
            `Font file exceeds maximum size of ${MAX_FONT_FILE_SIZE / 1024 / 1024}MB.`,
          );
        }
        totalSize += size;
      }
    }
  }

  if (totalSize > MAX_TOTAL_FONT_SIZE) {
    throw new Error(
      `Total embedded font data exceeds maximum of ${MAX_TOTAL_FONT_SIZE / 1024 / 1024}MB.`,
    );
  }
}

/**
 * Split CSS declarations by semicolons, but respect quoted strings and url() contents.
 * This is needed because data: URIs contain semicolons (e.g., "data:font/woff2;base64,...").
 */
function splitDeclarations(content: string): string[] {
  const declarations: string[] = [];
  let start = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (ch === "'" && !inDoubleQuote && parenDepth === 0) {
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote && parenDepth === 0) {
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === '(' && !inSingleQuote && !inDoubleQuote) {
      parenDepth++;
    } else if (
      ch === ')' &&
      !inSingleQuote &&
      !inDoubleQuote &&
      parenDepth > 0
    ) {
      parenDepth--;
    }

    if (ch === ';' && !inSingleQuote && !inDoubleQuote && parenDepth === 0) {
      const trimmed = content.substring(start, i).trim();
      if (trimmed) declarations.push(trimmed);
      start = i + 1;
    }
  }

  const trimmed = content.substring(start).trim();
  if (trimmed) declarations.push(trimmed);

  return declarations;
}

// ─── :root block validation ─────────────────────────────────────────────────

/**
 * Validate the content inside a :root { ... } block.
 * Only CSS custom properties (--*) with safe values are allowed.
 */
function validateRootContent(rootContent: string): void {
  // Check for forbidden at-rules inside :root
  if (/@[a-z-]+/i.test(rootContent)) {
    throw new Error(
      'Theme CSS contains forbidden at-rules (@import, @media, @keyframes, etc.). Only CSS variable declarations are allowed inside :root { ... }.',
    );
  }

  // Check for nested blocks
  if (/\{/.test(rootContent)) {
    throw new Error(
      'Theme CSS contains nested blocks or additional selectors. Only CSS variable declarations are allowed inside :root { ... }.',
    );
  }

  for (const decl of splitDeclarations(rootContent)) {
    const colonIndex = decl.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid CSS declaration: "${decl}"`);
    }

    const property = decl.substring(0, colonIndex).trim();

    // Property must start with --
    if (!property.startsWith('--')) {
      throw new Error(
        `Invalid property "${property}". Only CSS custom properties (starting with --) are allowed.`,
      );
    }

    // Validate property name format
    // CSS custom property names must:
    // - Start with --
    // - Not be empty (not just --)
    // - Not end with a dash
    // - Contain only valid characters (letters, digits, underscore, dash, but not at start/end positions)
    if (property === '--' || property === '-') {
      throw new Error(
        `Invalid property "${property}". Property name cannot be empty or contain only dashes.`,
      );
    }

    // Check for invalid characters in property name (no brackets, spaces, special chars except dash/underscore)
    // Property name after -- should only contain: letters, digits, underscore, and dashes (not consecutive dashes at start/end)
    const propertyNameAfterDashes = property.substring(2);
    if (propertyNameAfterDashes.length === 0) {
      throw new Error(
        `Invalid property "${property}". Property name cannot be empty after "--".`,
      );
    }

    // Check for invalid characters (no brackets, no special characters except underscore and dash)
    if (!/^[a-zA-Z0-9_-]+$/.test(propertyNameAfterDashes)) {
      throw new Error(
        `Invalid property "${property}". Property name contains invalid characters. Only letters, digits, underscores, and dashes are allowed.`,
      );
    }

    // Check that property doesn't end with a dash (after the -- prefix)
    if (property.endsWith('-')) {
      throw new Error(
        `Invalid property "${property}". Property name cannot end with a dash.`,
      );
    }

    // Extract and validate the value
    const value = decl.substring(colonIndex + 1).trim();
    validatePropertyValue(value, property);
  }
}

// ─── Main validation entry point ────────────────────────────────────────────

/**
 * Validate theme CSS. Accepts:
 * 1. Optional @font-face blocks (with data: URI fonts only)
 * 2. Exactly one :root { ... } block with CSS variable declarations
 *
 * @font-face blocks must appear before :root.
 * Returns the validated CSS or throws an error.
 */
export function validateThemeCss(css: string): string {
  // Strip multi-line comments before validation
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();

  // Extract @font-face blocks (if any) from the CSS
  const { fontFaceBlocks, remaining } = extractFontFaceBlocks(cleaned);

  // Validate @font-face blocks (reject remote URLs, enforce size limits)
  validateFontFaceBlocks(fontFaceBlocks);

  // Now validate the remaining CSS (should be exactly :root { ... })
  const rootMatch = remaining.match(/^:root\s*\{/);
  if (!rootMatch) {
    // If there are @font-face blocks but no :root, that's an error
    // If there's nothing at all, that's also an error
    throw new Error(
      'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  const rootStart = remaining.indexOf(':root');
  const openBrace = remaining.indexOf('{', rootStart);

  if (openBrace === -1) {
    throw new Error(
      'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  const closeBrace = remaining.indexOf('}', openBrace + 1);

  if (closeBrace === -1) {
    throw new Error(
      'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  const rootContent = remaining.substring(openBrace + 1, closeBrace).trim();

  // Validate :root content
  validateRootContent(rootContent);

  // Check nothing after :root
  const afterRoot = remaining.substring(closeBrace + 1).trim();
  if (afterRoot.length > 0) {
    throw new Error(
      'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  // Return the comment-stripped CSS — this is what was actually validated,
  // so we inject exactly what we checked (defense-in-depth).
  return cleaned;
}

// ─── Font embedding (install-time) ─────────────────────────────────────────

/** Map of file extensions to font MIME types for data: URI construction. */
const FONT_EXTENSION_MIME: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/opentype',
};

/** Convert an ArrayBuffer to a base64 string using chunked processing. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];
  // Process in 8 KB chunks to avoid excessive string concatenation
  for (let i = 0; i < bytes.length; i += 8192) {
    const chunk = bytes.subarray(i, Math.min(i + 8192, bytes.length));
    chunks.push(String.fromCharCode(...chunk));
  }
  return btoa(chunks.join(''));
}

/**
 * Embed fonts referenced in @font-face blocks by fetching them from a GitHub
 * repo and converting to data: URIs.
 *
 * This runs at install time only. Relative URL references like
 * `url('./fonts/MyFont.woff2')` are resolved relative to the repo's root
 * directory and fetched from GitHub's raw content API.
 *
 * The returned CSS has all font URLs replaced with self-contained data: URIs,
 * so no network requests are needed at runtime.
 *
 * @param css - The raw theme CSS (may contain relative url() references)
 * @param repo - GitHub repo in "owner/repo" format
 * @returns CSS with all font URLs replaced by data: URIs
 */
export async function embedThemeFonts(
  css: string,
  repo: string,
): Promise<string> {
  const baseUrl = `https://raw.githubusercontent.com/${repo}/refs/heads/main/`;

  // Collect all url() references that need fetching across all @font-face blocks
  const urlRegex = /url\(\s*(?:(['"])([^'"]*?)\1|([^'")\s]+))\s*\)/g;
  type FontRef = {
    fullMatch: string;
    quote: string;
    path: string;
    cleanPath: string;
    mime: string;
  };
  const fontRefs: FontRef[] = [];

  // Use extractFontFaceBlocks-style indexOf parsing to find @font-face blocks
  // and their url() references, without duplicating the regex approach
  let searchCss = css;
  let offset = 0;
  for (;;) {
    const atIdx = searchCss.indexOf('@font-face', 0);
    if (atIdx === -1) break;

    const openBrace = searchCss.indexOf('{', atIdx);
    if (openBrace === -1) break;

    const closeBrace = searchCss.indexOf('}', openBrace + 1);
    if (closeBrace === -1) break;

    const blockContent = searchCss.substring(openBrace + 1, closeBrace);

    // Find url() references within this block
    let urlMatch;
    urlRegex.lastIndex = 0;
    while ((urlMatch = urlRegex.exec(blockContent)) !== null) {
      const fullMatch = urlMatch[0];
      const quote = urlMatch[1] || '';
      const path = urlMatch[2] ?? urlMatch[3];

      // Skip data: URIs — already embedded
      if (path.startsWith('data:')) continue;

      if (/^https?:\/\//i.test(path)) {
        throw new Error(
          `Remote font URL "${path}" is not allowed. Only relative paths to fonts in the same GitHub repo are supported.`,
        );
      }

      const cleanPath = path.replace(/^\.\//, '');

      if (cleanPath.startsWith('/') || cleanPath.includes('..')) {
        throw new Error(
          `Font path "${path}" is not allowed. Only relative paths within the repo are supported (no "/" prefix or ".." segments).`,
        );
      }

      const ext = cleanPath.substring(cleanPath.lastIndexOf('.')).toLowerCase();
      const mime = FONT_EXTENSION_MIME[ext];
      if (!mime) {
        throw new Error(
          `Unsupported font file extension "${ext}". Supported: ${Object.keys(FONT_EXTENSION_MIME).join(', ')}.`,
        );
      }

      fontRefs.push({ fullMatch, quote, path, cleanPath, mime });
    }

    offset = closeBrace + 1;
    searchCss = searchCss.substring(offset);
  }

  if (fontRefs.length === 0) return css;

  // Fetch fonts sequentially to enforce a running total size budget
  const fetched: { ref: FontRef; dataUri: string }[] = [];
  let totalBytes = 0;
  for (const ref of fontRefs) {
    const fontUrl = baseUrl + ref.cleanPath;
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch font file "${ref.cleanPath}" from ${fontUrl}: ${response.status} ${response.statusText}`,
      );
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_FONT_FILE_SIZE) {
      throw new Error(
        `Font file "${ref.cleanPath}" exceeds maximum size of ${MAX_FONT_FILE_SIZE / 1024 / 1024}MB.`,
      );
    }
    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_TOTAL_FONT_SIZE) {
      throw new Error(
        `Total embedded font data exceeds maximum of ${MAX_TOTAL_FONT_SIZE / 1024 / 1024}MB.`,
      );
    }
    const base64 = arrayBufferToBase64(buffer);
    fetched.push({ ref, dataUri: `data:${ref.mime};base64,${base64}` });
  }

  // Replace each url() reference with its data: URI
  let result = css;
  for (const { ref, dataUri } of fetched) {
    const q = ref.quote || "'";
    result = result.replace(ref.fullMatch, `url(${q}${dataUri}${q})`);
  }

  return result;
}

/**
 * Generate a unique ID for a theme based on its repo URL or direct CSS URL.
 */
export function generateThemeId(urlOrRepo: string): string {
  // Simple hash-like ID from the URL
  let hash = 0;
  for (let i = 0; i < urlOrRepo.length; i++) {
    const char = urlOrRepo.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `theme-${Math.abs(hash).toString(36)}`;
}

/**
 * Parse the installed theme JSON from global prefs.
 * Returns a single InstalledTheme or null if none is installed.
 */
export function parseInstalledTheme(
  json: string | undefined,
): InstalledTheme | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string' &&
      typeof parsed.repo === 'string' &&
      typeof parsed.cssContent === 'string'
    ) {
      const result: InstalledTheme = {
        id: parsed.id,
        name: parsed.name,
        repo: parsed.repo,
        cssContent: parsed.cssContent,
      };
      if (
        typeof parsed.baseTheme === 'string' &&
        BASE_THEME_OPTIONS.includes(
          parsed.baseTheme as (typeof BASE_THEME_OPTIONS)[number],
        )
      ) {
        result.baseTheme = parsed.baseTheme as BaseTheme;
      }
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Serialize installed theme to JSON for global prefs.
 */
export function serializeInstalledTheme(theme: InstalledTheme | null): string {
  return JSON.stringify(theme);
}

/**
 * Extract the legacy `overrideCss` field from an installed theme JSON string.
 * Used by the one-time migration that moves the field out of InstalledTheme
 * and into the standalone `customCssOverride` global pref.
 *
 * Returns null if the JSON is missing, malformed, not an object, or does not
 * contain a non-whitespace string `overrideCss` field. Leading/trailing
 * whitespace is stripped from the returned value.
 */
export function extractLegacyOverride(json: string | undefined): string | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      typeof parsed.overrideCss === 'string'
    ) {
      const trimmed = parsed.overrideCss.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * One-time migration helper: moves a legacy `overrideCss` field out of the
 * installed theme JSON blobs and into the standalone customCssOverride value.
 *
 * Collision rule: if both light and dark carry a legacy override, light wins.
 * The other is silently dropped — users wrote one shared override in the UI
 * today; two different values is a pathological case that only shows up if
 * someone edited prefs.json by hand.
 *
 * Returns null when no migration is needed. Otherwise returns the migrated
 * override plus the re-serialized installed theme JSONs (with `overrideCss`
 * stripped). Callers write all three values back to global prefs.
 */
export function migrateLegacyOverride(params: {
  existingOverride: string | undefined;
  lightJson: string | undefined;
  darkJson: string | undefined;
}): {
  override: string;
  newLightJson: string | undefined;
  newDarkJson: string | undefined;
} | null {
  const { existingOverride, lightJson, darkJson } = params;

  if (existingOverride?.trim()) {
    return null;
  }

  const lightLegacy = extractLegacyOverride(lightJson);
  const darkLegacy = extractLegacyOverride(darkJson);
  const legacy = lightLegacy ?? darkLegacy;
  if (!legacy) {
    return null;
  }

  // parseInstalledTheme strips any unknown fields (including the legacy
  // overrideCss) by building the result from explicit field assignments.
  const stripOverride = (json: string | undefined): string | undefined => {
    const parsed = parseInstalledTheme(json);
    return parsed ? serializeInstalledTheme(parsed) : json;
  };

  return {
    override: legacy,
    newLightJson: lightLegacy ? stripOverride(lightJson) : lightJson,
    newDarkJson: darkLegacy ? stripOverride(darkJson) : darkJson,
  };
}
