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
  overrideCss?: string; // Additional free-text CSS overrides on top of cssContent
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

/**
 * Allowlist of safe font families for custom themes.
 *
 * Security rationale: For --font-* CSS variables, we allow:
 * 1. System-installed and bundled fonts (zero network requests)
 * 2. Custom font names declared via @font-face in the same theme CSS
 *    (fonts are embedded as data: URIs at install time — no runtime requests)
 *
 * This prevents third-party tracking via font requests while still
 * enabling truly custom fonts through local embedding.
 */
export const SAFE_FONT_FAMILIES: ReadonlySet<string> = new Set([
  // === CSS generic font families ===
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji',

  // === Bundled with Actual ===
  'Inter Variable',
  'Redacted Script',

  // === Common web-safe / system fonts ===
  // Sans-serif
  'Arial',
  'Helvetica',
  'Helvetica Neue',
  'Verdana',
  'Geneva',
  'Tahoma',
  'Trebuchet MS',
  'Segoe UI',
  'Roboto',
  'Ubuntu',
  'Cantarell',
  'Fira Sans',
  'Droid Sans',
  'Oxygen',
  'Lucida Grande',
  'Lucida Sans Unicode',
  'Lucida Sans',
  'DejaVu Sans',
  'Noto Sans',
  'Liberation Sans',
  'Calibri',
  'Gill Sans',
  'Optima',
  'Futura',
  'Century Gothic',
  'Franklin Gothic Medium',
  // macOS
  'SF Pro',
  'SF Pro Display',
  'SF Pro Text',
  'SF Pro Rounded',
  '-apple-system',
  'BlinkMacSystemFont',

  // Serif
  'Georgia',
  'Times New Roman',
  'Times',
  'Palatino',
  'Palatino Linotype',
  'Book Antiqua',
  'Garamond',
  'Cambria',
  'Constantia',
  'Baskerville',
  'Hoefler Text',
  'Didot',
  'Bodoni MT',
  'Rockwell',
  'DejaVu Serif',
  'Noto Serif',
  'Liberation Serif',
  // macOS
  'New York',
  'Charter',
  'Iowan Old Style',

  // Monospace
  'Courier New',
  'Courier',
  'Consolas',
  'Monaco',
  'Menlo',
  'Andale Mono',
  'Lucida Console',
  'DejaVu Sans Mono',
  'Noto Sans Mono',
  'Liberation Mono',
  'Source Code Pro',
  'Fira Mono',
  'Fira Code',
  'JetBrains Mono',
  'IBM Plex Mono',
  // macOS
  'SF Mono',
]);

/**
 * Normalised lookup: lower-cased font name → canonical (display) name.
 * Used for case-insensitive matching while preserving original casing.
 */
const SAFE_FONT_FAMILIES_LOWER: ReadonlyMap<string, string> = new Map(
  [...SAFE_FONT_FAMILIES].map(f => [f.toLowerCase(), f]),
);

/**
 * Validate a font-family value for a --font-* CSS variable.
 *
 * Accepts a comma-separated list of font names. Each font name is
 * matched case-insensitively against either:
 * 1. The static SAFE_FONT_FAMILIES allowlist (system/web-safe fonts)
 * 2. Font names declared via @font-face in the same theme CSS
 *
 * Quoted or unquoted font names are both accepted.
 *
 * Examples of accepted values:
 *   Georgia, serif
 *   'Fira Code', monospace
 *   "My Theme Font", sans-serif     (if declared in @font-face)
 */
function validateFontFamilyValue(
  value: string,
  property: string,
  declaredFonts?: ReadonlySet<string>,
): void {
  const trimmed = value.trim();
  if (!trimmed) return; // empty values are allowed

  // Split on commas, then validate each font name
  const families = trimmed.split(',');

  for (const raw of families) {
    // Strip leading/trailing whitespace and optional quotes
    let name = raw.trim();
    if (
      (name.startsWith("'") && name.endsWith("'")) ||
      (name.startsWith('"') && name.endsWith('"'))
    ) {
      name = name.slice(1, -1).trim();
    }

    if (!name) {
      throw new Error(
        `Invalid font-family value for "${property}": empty font name in comma-separated list.`,
      );
    }

    // Reject anything that looks like a function call (url(), etc.)
    if (/\(/.test(name)) {
      throw new Error(
        `Invalid font-family value for "${property}": function calls are not allowed. Only safe font names are permitted.`,
      );
    }

    // Case-insensitive lookup against static allowlist
    if (SAFE_FONT_FAMILIES_LOWER.has(name.toLowerCase())) {
      continue;
    }

    // Check against custom fonts declared in @font-face blocks
    if (declaredFonts) {
      const lowerName = name.toLowerCase();
      if ([...declaredFonts].some(f => f.toLowerCase() === lowerName)) {
        continue;
      }
    }

    throw new Error(
      `Invalid font-family value "${name}" for "${property}". Only safe system/web-safe fonts and fonts declared via @font-face are allowed. ` +
        `External fonts are not permitted to protect user privacy.`,
    );
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
function validatePropertyValue(
  value: string,
  property: string,
  declaredFonts?: ReadonlySet<string>,
): void {
  // Font-family properties use a dedicated validator: comma-separated safe font names only.
  // We match specific property name patterns rather than all --font-* to avoid
  // catching unrelated variables like --font-weight or --font-size.
  if (/^--font-(family|mono|heading|ui|display|code)$/i.test(property)) {
    validateFontFamilyValue(value, property, declaredFonts);
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

/** Allowed MIME types for data: URI fonts. */
const FONT_DATA_URI_MIME_TYPES = new Set([
  'font/woff2',
  'font/woff',
  'font/ttf',
  'font/otf',
  'font/opentype',
  'application/font-woff',
  'application/font-woff2',
  'application/x-font-ttf',
  'application/x-font-opentype',
]);

/** Allowed format() hints in @font-face src. */
const FONT_FORMAT_HINTS = new Set([
  'woff2',
  'woff',
  'truetype',
  'opentype',
  'embedded-opentype',
]);

/** Allowed properties inside @font-face. */
const FONT_FACE_ALLOWED_PROPERTIES = new Set([
  'font-family',
  'src',
  'font-weight',
  'font-style',
  'font-display',
  'font-stretch',
  'unicode-range',
]);

/** Valid font-weight values. */
const FONT_WEIGHT_PATTERN = /^(normal|bold|lighter|bolder|\d{3})(\s+\d{3})?$/i;

/** Valid font-style values. */
const FONT_STYLE_PATTERN = /^(normal|italic|oblique(\s+\d+deg)?)$/i;

/** Valid font-display values. */
const FONT_DISPLAY_PATTERN = /^(auto|block|swap|fallback|optional)$/i;

/** Valid font-stretch values. */
const FONT_STRETCH_PATTERN =
  /^(normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded|\d+%(\s+\d+%)?)$/i;

/** Valid unicode-range values. */
const UNICODE_RANGE_PATTERN =
  /^(U\+[0-9a-fA-F]{1,6}(-[0-9a-fA-F]{1,6})?)(\s*,\s*U\+[0-9a-fA-F]{1,6}(-[0-9a-fA-F]{1,6})?)*$/i;

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

  // Match @font-face { ... } blocks. We use indexOf-based parsing
  // instead of regex to handle the braces correctly.
  const searchFrom = 0;
  while (searchFrom < remaining.length) {
    const atIdx = remaining.indexOf('@font-face', searchFrom);
    if (atIdx === -1) break;

    const openBrace = remaining.indexOf('{', atIdx);
    if (openBrace === -1) break;

    const closeBrace = remaining.indexOf('}', openBrace + 1);
    if (closeBrace === -1) break;

    const blockContent = remaining.substring(openBrace + 1, closeBrace).trim();
    fontFaceBlocks.push(blockContent);

    // Remove the @font-face block from remaining
    remaining =
      remaining.substring(0, atIdx) + remaining.substring(closeBrace + 1);
    // Don't advance searchFrom — the string shifted
  }

  return { fontFaceBlocks, remaining: remaining.trim() };
}

/**
 * Validate a data: URI for a font. Returns the estimated decoded size.
 * Only allows font/* and application/font-* MIME types with base64 encoding.
 */
function validateFontDataUri(uri: string): number {
  // Pattern: data:<mime>;base64,<data>
  const match = uri.match(
    /^data:([a-zA-Z0-9/._+-]+);base64,([A-Za-z0-9+/=\s]+)$/,
  );
  if (!match) {
    throw new Error(
      'Invalid font src: only data: URIs with base64 encoding are allowed. ' +
        'Remote URLs are not permitted to protect user privacy.',
    );
  }

  const mime = match[1].toLowerCase();
  const base64Data = match[2].replace(/\s/g, '');

  if (!FONT_DATA_URI_MIME_TYPES.has(mime)) {
    throw new Error(
      `Invalid font MIME type "${mime}". Allowed types: ${[...FONT_DATA_URI_MIME_TYPES].join(', ')}.`,
    );
  }

  // Validate that the base64 content is valid
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
    throw new Error('Invalid base64 encoding in font data: URI.');
  }

  // Estimate decoded size (base64 is ~4/3 of original)
  const decodedSize = Math.ceil((base64Data.length * 3) / 4);
  if (decodedSize > MAX_FONT_FILE_SIZE) {
    throw new Error(
      `Font file exceeds maximum size of ${MAX_FONT_FILE_SIZE / 1024 / 1024}MB.`,
    );
  }

  return decodedSize;
}

/**
 * Validate the `src` property of an @font-face block.
 * Only allows `url(data:font/...;base64,...) format('...')` syntax.
 * Returns the estimated total decoded font size.
 */
function validateFontFaceSrc(value: string): number {
  const trimmed = value.trim();
  let totalSize = 0;

  // Match url(...) entries with optional format(...) hints.
  // We use a regex to find url() blocks rather than splitting by comma,
  // because data: URIs contain commas in `base64,<data>`.
  const urlEntryRegex =
    /url\(\s*(['"]?)([\s\S]*?)\1\s*\)(\s+format\(\s*(['"]?)([^'")\s]+)\4\s*\))?/g;
  let match;
  let foundAny = false;

  while ((match = urlEntryRegex.exec(trimmed)) !== null) {
    foundAny = true;
    const uri = match[2];
    const formatHint = match[5];

    // URI must be a data: URI
    if (!uri.startsWith('data:')) {
      throw new Error(
        'Invalid font src: only data: URIs are allowed in @font-face. ' +
          'Remote URLs (http/https) are not permitted to protect user privacy. ' +
          'Font files are automatically embedded when installing from GitHub.',
      );
    }

    totalSize += validateFontDataUri(uri);

    // Validate format hint if present
    if (formatHint && !FONT_FORMAT_HINTS.has(formatHint.toLowerCase())) {
      throw new Error(
        `Invalid font format hint "${formatHint}". Allowed: ${[...FONT_FORMAT_HINTS].join(', ')}.`,
      );
    }
  }

  if (!foundAny) {
    throw new Error(
      "Invalid @font-face src value. Expected: url('data:font/...;base64,...') format('woff2').",
    );
  }

  return totalSize;
}

/**
 * Split CSS declarations by semicolons, but respect quoted strings and url() contents.
 * This is needed because data: URIs contain semicolons (e.g., "data:font/woff2;base64,...").
 */
function splitDeclarations(content: string): string[] {
  const declarations: string[] = [];
  let current = '';
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
      const trimmed = current.trim();
      if (trimmed) declarations.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }

  const trimmed = current.trim();
  if (trimmed) declarations.push(trimmed);

  return declarations;
}

/**
 * Validate a single @font-face block's content and collect the declared font-family.
 * Returns the estimated font data size.
 */
function validateFontFaceBlock(
  blockContent: string,
  declaredFonts: Set<string>,
): number {
  const declarations = splitDeclarations(blockContent);

  let fontFamily: string | null = null;
  let hasSrc = false;
  let blockSize = 0;

  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid @font-face declaration: "${decl}"`);
    }

    const property = decl.substring(0, colonIndex).trim().toLowerCase();
    const value = decl.substring(colonIndex + 1).trim();

    if (!FONT_FACE_ALLOWED_PROPERTIES.has(property)) {
      throw new Error(
        `Invalid @font-face property "${property}". Allowed properties: ${[...FONT_FACE_ALLOWED_PROPERTIES].join(', ')}.`,
      );
    }

    switch (property) {
      case 'font-family': {
        // Must be a quoted string
        let name = value;
        if (
          (name.startsWith("'") && name.endsWith("'")) ||
          (name.startsWith('"') && name.endsWith('"'))
        ) {
          name = name.slice(1, -1).trim();
        }
        if (!name || !/^[a-zA-Z0-9 _-]+$/.test(name)) {
          throw new Error(
            `Invalid @font-face font-family name "${value}". Must be a simple alphanumeric name (letters, digits, spaces, hyphens, underscores).`,
          );
        }
        fontFamily = name;
        break;
      }
      case 'src':
        blockSize = validateFontFaceSrc(value);
        hasSrc = true;
        break;
      case 'font-weight':
        if (!FONT_WEIGHT_PATTERN.test(value)) {
          throw new Error(
            `Invalid @font-face font-weight "${value}". Expected: normal, bold, or a numeric weight (100-900).`,
          );
        }
        break;
      case 'font-style':
        if (!FONT_STYLE_PATTERN.test(value)) {
          throw new Error(
            `Invalid @font-face font-style "${value}". Expected: normal, italic, or oblique.`,
          );
        }
        break;
      case 'font-display':
        if (!FONT_DISPLAY_PATTERN.test(value)) {
          throw new Error(
            `Invalid @font-face font-display "${value}". Expected: auto, block, swap, fallback, or optional.`,
          );
        }
        break;
      case 'font-stretch':
        if (!FONT_STRETCH_PATTERN.test(value)) {
          throw new Error(`Invalid @font-face font-stretch "${value}".`);
        }
        break;
      case 'unicode-range':
        if (!UNICODE_RANGE_PATTERN.test(value)) {
          throw new Error(
            `Invalid @font-face unicode-range "${value}". Expected: U+hex or U+hex-hex ranges.`,
          );
        }
        break;
      default:
        break;
    }
  }

  if (!fontFamily) {
    throw new Error('@font-face block must include a font-family declaration.');
  }
  if (!hasSrc) {
    throw new Error('@font-face block must include a src declaration.');
  }

  declaredFonts.add(fontFamily);
  return blockSize;
}

// ─── :root block validation ─────────────────────────────────────────────────

/**
 * Validate the content inside a :root { ... } block.
 * Only CSS custom properties (--*) with safe values are allowed.
 */
function validateRootContent(
  rootContent: string,
  declaredFonts?: ReadonlySet<string>,
): void {
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

  const declarations = rootContent
    .split(';')
    .map(d => d.trim())
    .filter(d => d.length > 0);

  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid CSS declaration: "${decl}"`);
    }

    const property = decl.substring(0, colonIndex).trim();

    if (!property.startsWith('--')) {
      throw new Error(
        `Invalid property "${property}". Only CSS custom properties (starting with --) are allowed.`,
      );
    }

    if (property === '--' || property === '-') {
      throw new Error(
        `Invalid property "${property}". Property name cannot be empty or contain only dashes.`,
      );
    }

    const propertyNameAfterDashes = property.substring(2);
    if (propertyNameAfterDashes.length === 0) {
      throw new Error(
        `Invalid property "${property}". Property name cannot be empty after "--".`,
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(propertyNameAfterDashes)) {
      throw new Error(
        `Invalid property "${property}". Property name contains invalid characters. Only letters, digits, underscores, and dashes are allowed.`,
      );
    }

    if (property.endsWith('-')) {
      throw new Error(
        `Invalid property "${property}". Property name cannot end with a dash.`,
      );
    }

    const value = decl.substring(colonIndex + 1).trim();
    validatePropertyValue(value, property, declaredFonts);
  }
}

// ─── Main validation entry point ────────────────────────────────────────────

/**
 * Validate theme CSS. Accepts:
 * 1. Optional @font-face blocks (with data: URI fonts only)
 * 2. Exactly one :root { ... } block with CSS variable declarations
 *
 * @font-face blocks must appear before :root.
 * Font names declared in @font-face are allowed in --font-* property values.
 *
 * Returns the validated CSS or throws an error.
 */
export function validateThemeCss(css: string): string {
  // Strip multi-line comments before validation
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();

  // Extract @font-face blocks (if any) from the CSS
  const { fontFaceBlocks, remaining } = extractFontFaceBlocks(cleaned);

  // Validate each @font-face block and collect declared font names
  const declaredFonts = new Set<string>();
  let totalFontSize = 0;

  for (const block of fontFaceBlocks) {
    totalFontSize += validateFontFaceBlock(block, declaredFonts);
  }

  if (totalFontSize > MAX_TOTAL_FONT_SIZE) {
    throw new Error(
      `Total embedded font data exceeds maximum of ${MAX_TOTAL_FONT_SIZE / 1024 / 1024}MB.`,
    );
  }

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

  // Validate :root content with knowledge of declared fonts
  validateRootContent(rootContent, declaredFonts);

  // Check nothing after :root
  const afterRoot = remaining.substring(closeBrace + 1).trim();
  if (afterRoot.length > 0) {
    throw new Error(
      'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  // Return the original CSS so it can be injected properly
  return css.trim();
}

// ─── Font embedding (install-time) ─────────────────────────────────────────

/** Map of file extensions to font MIME types for data: URI construction. */
const FONT_EXTENSION_MIME: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/opentype',
};

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

  // Find all url() references inside @font-face blocks
  // We process the full CSS string and replace url() values that are
  // relative paths (not data: URIs) within @font-face contexts
  const fontFaceRegex = /@font-face\s*\{[^}]*\}/g;
  let result = css;

  const fontFaceMatches = [...css.matchAll(fontFaceRegex)];

  for (const fontFaceMatch of fontFaceMatches) {
    const block = fontFaceMatch[0];
    let newBlock = block;

    // Find url() references in this block
    const urlRegex = /url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g;
    const urlMatches = [...block.matchAll(urlRegex)];

    for (const urlMatch of urlMatches) {
      const fullUrl = urlMatch[0];
      const quote = urlMatch[1];
      const path = urlMatch[2];

      // Skip data: URIs — they're already embedded
      if (path.startsWith('data:')) continue;

      // Skip absolute URLs (http/https) — these are not allowed
      if (/^https?:\/\//i.test(path)) {
        throw new Error(
          `Remote font URL "${path}" is not allowed. Only relative paths to fonts in the same GitHub repo are supported.`,
        );
      }

      // Resolve relative path
      const cleanPath = path.replace(/^\.\//, '');
      const fontUrl = baseUrl + cleanPath;

      // Determine MIME type from extension
      const ext = cleanPath.substring(cleanPath.lastIndexOf('.')).toLowerCase();
      const mime = FONT_EXTENSION_MIME[ext];
      if (!mime) {
        throw new Error(
          `Unsupported font file extension "${ext}". Supported: ${Object.keys(FONT_EXTENSION_MIME).join(', ')}.`,
        );
      }

      // Fetch the font file
      const response = await fetch(fontUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch font file "${cleanPath}" from ${fontUrl}: ${response.status} ${response.statusText}`,
        );
      }

      // Convert to base64
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_FONT_FILE_SIZE) {
        throw new Error(
          `Font file "${cleanPath}" exceeds maximum size of ${MAX_FONT_FILE_SIZE / 1024 / 1024}MB.`,
        );
      }

      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      const base64 = btoa(binary);
      const dataUri = `data:${mime};base64,${base64}`;

      // Replace the url() reference with the data: URI
      const q = quote || "'";
      newBlock = newBlock.replace(fullUrl, `url(${q}${dataUri}${q})`);
    }

    result = result.replace(block, newBlock);
  }

  return result;
}

/**
 * Validate and concatenate cssContent and overrideCss into a single CSS string.
 * Returns empty string if neither is present.
 */
export function validateAndCombineThemeCss(
  cssContent?: string,
  overrideCss?: string,
): string {
  const parts = [
    cssContent && validateThemeCss(cssContent),
    overrideCss && validateThemeCss(overrideCss),
  ].filter(Boolean);
  return parts.join('\n');
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
      if (typeof parsed.overrideCss === 'string' && parsed.overrideCss) {
        result.overrideCss = parsed.overrideCss;
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
