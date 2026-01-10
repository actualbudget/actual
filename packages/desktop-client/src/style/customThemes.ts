/**
 * Custom theme utilities: fetch, validation, and storage helpers.
 */

export type CatalogTheme = {
  name: string;
  repo: string;
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
 * Get the screenshot URL for a theme repo.
 * Returns a safe fallback URL for malformed repos.
 */
export function getThemeScreenshotUrl(repo: string): string {
  if (
    !repo ||
    typeof repo !== 'string' ||
    !repo.trim() ||
    !repo.includes('/')
  ) {
    // Return a placeholder or empty data URL for malformed repos
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQwIiBoZWlnaHQ9IjYwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxNDAiIGhlaWdodD0iNjAiIGZpbGw9IiNmNWY1ZjUiLz48L3N2Zz4=';
  }
  const trimmed = repo.trim();
  return `https://raw.githubusercontent.com/${trimmed}/refs/heads/main/screenshot.png`;
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
 * Validate that a CSS property value doesn't contain dangerous content.
 * Checks for XSS vectors like javascript: URLs, external URLs, script tags, etc.
 */
function validatePropertyValue(value: string, property: string): void {
  if (!value || value.length === 0) {
    return; // Empty values are allowed
  }

  // Check for dangerous protocols (case-insensitive)
  const dangerousProtocols = [
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /data\s*:\s*text\/(html|xml)/i,
    /data\s*:\s*image\/svg\+xml/i, // SVG can contain script
  ];

  for (const pattern of dangerousProtocols) {
    if (pattern.test(value)) {
      throw new Error(
        // oxlint-disable-next-line eslint/no-script-url
        `Dangerous content detected in property "${property}": CSS property values cannot contain ${pattern.source.includes('javascript') ? 'javascript:' : pattern.source.includes('vbscript') ? 'vbscript:' : 'data:'} URLs.`,
      );
    }
  }

  // Check for url() functions - reject ALL url() functions (local, remote, relative, absolute)
  // This prevents any potential XSS vectors through URLs
  // Match url() with various quote styles and whitespace
  // Pattern matches: url(...), url("..."), url('...'), url(`...`)
  if (/url\s*\(/i.test(value)) {
    throw new Error(
      `URL function detected in property "${property}": CSS property values cannot contain url() functions (local, remote, or relative URLs are not allowed).`,
    );
  }

  // Check for dangerous protocols outside of url() functions (if any slip through)
  if (/javascript\s*:/i.test(value)) {
    throw new Error(
      `JavaScript URL detected in property "${property}": CSS property values cannot contain javascript: protocol.`,
    );
  }
  if (/vbscript\s*:/i.test(value)) {
    throw new Error(
      `VBScript URL detected in property "${property}": CSS property values cannot contain vbscript: protocol.`,
    );
  }
  if (/data\s*:\s*text\/(html|xml)/i.test(value)) {
    throw new Error(
      `Dangerous data URL detected in property "${property}": CSS property values cannot contain data:text/html or data:text/xml URLs.`,
    );
  }
  // Check for external URLs (http://, https://, //)
  if (/(https?:\/\/|\/\/)/i.test(value)) {
    throw new Error(
      `External URL detected in property "${property}": CSS property values cannot contain external URLs (http://, https://, //).`,
    );
  }

  // Check for expression() function (IE XSS vector)
  if (/expression\s*\(/i.test(value)) {
    throw new Error(
      `Expression function detected in property "${property}": CSS property values cannot contain expression() functions.`,
    );
  }

  // Check for script tags
  if (/<script[\s>]/i.test(value)) {
    throw new Error(
      `Script tag detected in property "${property}": CSS property values cannot contain <script> tags.`,
    );
  }

  // Check for event handlers (onerror, onclick, etc.)
  if (/\bon\w+\s*=/i.test(value)) {
    throw new Error(
      `Event handler detected in property "${property}": CSS property values cannot contain event handlers (onclick, onerror, etc.).`,
    );
  }

  // Check for encoded JavaScript URLs (hex encoded)
  // Look for patterns like \6a\61\76\61\73\63\72\69\70\74\3a (javascript:)
  const encodedJsPattern =
    /\\[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}[\s\\]*[0-9a-f]{1,2}/i;
  if (encodedJsPattern.test(value)) {
    // Decode and check if it's javascript:
    try {
      // Simple hex decode check for common patterns
      const potentialJs = value
        .replace(/\\([0-9a-f]{1,2})/gi, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16)),
        )
        .toLowerCase();

      // oxlint-disable-next-line eslint/no-script-url
      if (potentialJs.includes('javascript:')) {
        throw new Error(
          `Encoded JavaScript URL detected in property "${property}": CSS property values cannot contain encoded javascript: URLs.`,
        );
      }
    } catch {
      // If decoding fails, still throw error if pattern matches
      throw new Error(
        `Suspicious encoded content detected in property "${property}": CSS property values cannot contain encoded URLs.`,
      );
    }
  }

  // Check for URL-encoded dangerous protocols (%3A is :, %6A is j, etc.)
  // Check for javascript%3A or similar
  const urlEncodedJsPattern =
    /javascript\s*%3[aA]|%6[1aA]\s*%76\s*%61\s*%73\s*%63\s*%72\s*%69\s*%70\s*%74\s*%3[aA]/i;
  if (urlEncodedJsPattern.test(value)) {
    throw new Error(
      `URL-encoded JavaScript protocol detected in property "${property}": CSS property values cannot contain encoded javascript: URLs.`,
    );
  }
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

  // Find the matching closing brace for :root's opening brace
  let braceCount = 0;
  let contentStart = -1;
  let contentEnd = -1;
  const rootStart = cleaned.indexOf(':root');
  const openBrace = cleaned.indexOf('{', rootStart);

  if (openBrace === -1) {
    throw new Error(
      'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  contentStart = openBrace + 1;
  braceCount = 1;

  for (let j = contentStart; j < cleaned.length; j++) {
    if (cleaned[j] === '{') braceCount++;
    if (cleaned[j] === '}') {
      braceCount--;
      if (braceCount === 0) {
        contentEnd = j;
        break;
      }
    }
  }

  if (contentEnd === -1) {
    throw new Error(
      'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  // Check that there's nothing after the closing brace
  const afterRoot = cleaned.substring(contentEnd + 1).trim();
  if (afterRoot.length > 0) {
    throw new Error(
      'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
    );
  }

  // Extract content inside :root { ... }
  const rootContent = cleaned.substring(contentStart, contentEnd).trim();

  // Check for forbidden at-rules
  if (
    /@(import|media|keyframes|font-face|supports|charset)/i.test(rootContent)
  ) {
    throw new Error(
      'Theme CSS contains forbidden at-rules (@import, @media, etc.). Only CSS variable declarations are allowed.',
    );
  }

  // Check for nested blocks (additional selectors) - should not have any { after extracting :root content
  if (/\{/.test(rootContent)) {
    throw new Error(
      'Theme CSS contains nested blocks or additional selectors. Only CSS variable declarations are allowed inside :root { ... }.',
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
