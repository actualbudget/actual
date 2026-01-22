/**
 * Custom theme utilities: fetch, validation, and storage helpers.
 */

export type CatalogTheme = {
  name: string;
  repo: string;
  colors?: string[];
};

export type InstalledTheme = {
  id: string;
  name: string;
  repo: string;
  cssContent: string; // CSS content stored when theme is installed (required)
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
 * Validate that a CSS property value only contains allowed content (allowlist approach).
 * Only simple, safe CSS values are allowed - no functions (except rgb/rgba/hsl/hsla), no URLs, no complex constructs.
 * Explicitly rejects var() and other function calls to prevent variable references and complex expressions.
 */
function validatePropertyValue(value: string, property: string): void {
  if (!value || value.length === 0) {
    return; // Empty values are allowed
  }

  const trimmedValue = value.trim();

  // Allowlist: Only allow specific safe CSS value patterns
  // 1. Hex colors: #RGB, #RRGGBB, or #RRGGBBAA (3, 6, or 8 hex digits)
  const hexColorPattern = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?$/;

  // 2. RGB/RGBA functions: rgb(...) or rgba(...) with simple numeric/percentage values
  // Allow optional whitespace and support both integers and decimals
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
    `Invalid value "${trimmedValue}" for property "${property}". Only simple CSS values are allowed (colors, lengths, numbers, or keywords). Functions (including var()), URLs, and other complex constructs are not permitted.`,
  );
}

/**
 * Validate that CSS contains only :root { ... } with CSS custom property (variable) declarations.
 * Must contain exactly :root { ... } and nothing else.
 * Returns the validated CSS or throws an error.
 */
export function validateThemeCss(css: string): string {
  // Strip multi-line comments before validation
  // Note: Single-line comments (//) are not stripped to avoid corrupting CSS values like URLs
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();

  // Must contain exactly :root { ... } and nothing else
  // Find :root { ... } and extract content, then check there's nothing after
  const rootMatch = cleaned.match(/^:root\s*\{/);
  if (!rootMatch) {
    throw new Error(
      'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  // Find the opening brace after :root
  const rootStart = cleaned.indexOf(':root');
  const openBrace = cleaned.indexOf('{', rootStart);

  if (openBrace === -1) {
    throw new Error(
      'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  // Find the first closing brace (nested blocks will be caught by the check below)
  const closeBrace = cleaned.indexOf('}', openBrace + 1);

  if (closeBrace === -1) {
    throw new Error(
      'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  // Extract content inside :root { ... }
  const rootContent = cleaned.substring(openBrace + 1, closeBrace).trim();

  // Check for forbidden at-rules first (before nested block check, since at-rules with braces would trigger that)
  // Comprehensive list of CSS at-rules that should not be allowed
  // This includes @import, @media, @keyframes, @font-face, @supports, @charset,
  // @namespace, @page, @layer, @container, @scope, and any other at-rules
  if (/@[a-z-]+/i.test(rootContent)) {
    throw new Error(
      'Theme CSS contains forbidden at-rules (@import, @media, @keyframes, etc.). Only CSS variable declarations are allowed inside :root { ... }.',
    );
  }

  // Check for nested blocks (additional selectors) - should not have any { after extracting :root content
  if (/\{/.test(rootContent)) {
    throw new Error(
      'Theme CSS contains nested blocks or additional selectors. Only CSS variable declarations are allowed inside :root { ... }.',
    );
  }

  // Check that there's nothing after the closing brace
  const afterRoot = cleaned.substring(closeBrace + 1).trim();
  if (afterRoot.length > 0) {
    throw new Error(
      'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  // Parse declarations and validate each one
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

  // Return the original CSS (with :root wrapper) so it can be injected properly
  return css.trim();
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
      return {
        id: parsed.id,
        name: parsed.name,
        repo: parsed.repo,
        cssContent: parsed.cssContent,
      } satisfies InstalledTheme;
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
