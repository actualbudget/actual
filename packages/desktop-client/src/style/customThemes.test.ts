// oxlint-disable eslint/no-script-url
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  embedThemeFonts,
  MAX_FONT_FILE_SIZE,
  parseInstalledTheme,
  validateThemeCss,
} from './customThemes';
import type { InstalledTheme } from './customThemes';

// Small valid woff2 data URI for testing (actual content doesn't matter for validation)
const TINY_WOFF2_BASE64 = 'AAAAAAAAAA==';
const TINY_WOFF2_DATA_URI = `data:font/woff2;base64,${TINY_WOFF2_BASE64}`;
const FONT_FACE_BLOCK = `@font-face {
  font-family: 'Test Font';
  src: url('${TINY_WOFF2_DATA_URI}') format('woff2');
  font-display: swap;
}`;

describe('validateThemeCss', () => {
  describe('valid CSS', () => {
    it('should accept valid :root with CSS variables', () => {
      const css = `:root {
        --color-primary: #007bff;
        --color-secondary: #6c757d;
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
      expect(validateThemeCss(css)).toBe(css.trim());
    });

    it('should accept :root with single CSS variable', () => {
      const css = `:root {
        --color-primary: #007bff;
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept :root with empty content', () => {
      const css = `:root {
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept CSS with multi-line comments inside :root', () => {
      const css = `:root {
        /* Primary color */
        --color-primary: #007bff;
        /* Secondary color */
        --color-secondary: #6c757d;
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept CSS with whitespace variations', () => {
      const css = `:root{--color-primary:#007bff;--color-secondary:#6c757d;}`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept CSS with multi-line format', () => {
      const css = `:root {
        --color-primary: #007bff;
        --color-secondary: #6c757d;
        --spacing-small: 4px;
        --spacing-medium: 8px;
        --spacing-large: 16px;
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });
  });

  describe('invalid CSS - missing :root', () => {
    it.each([
      {
        description: 'CSS without :root wrapper',
        css: `--color-primary: #007bff;`,
      },
      {
        description: 'CSS with only CSS variables',
        css: `--color-primary: #007bff;
--color-secondary: #6c757d;`,
      },
    ])('should reject $description', ({ css }) => {
      expect(() => validateThemeCss(css)).toThrow(
        'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
      );
    });
  });

  describe('invalid CSS - additional selectors', () => {
    it.each([
      {
        description: 'additional selectors outside :root',
        css: `:root {
        --color-primary: #007bff;
      }
      .some-class {
        color: red;
      }`,
        expectedError:
          'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
      },
      {
        description: 'multiple selectors',
        css: `:root {
        --color-primary: #007bff;
      }
      :root.light {
        --color-primary: #ffffff;
      }`,
        expectedError:
          'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
      },
      {
        description: 'media queries',
        css: `:root {
        --color-primary: #007bff;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --color-primary: #ffffff;
        }
      }`,
        expectedError:
          'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
      },
      {
        description: 'custom selector before :root',
        css: `.before {
        color: red;
      }
      :root {
        --color-primary: #007bff;
      }`,
        expectedError:
          'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
      },
    ])('should reject CSS with $description', ({ css, expectedError }) => {
      expect(() => validateThemeCss(css)).toThrow(expectedError);
    });

    it('should reject CSS with nested selectors inside :root', () => {
      const css = `:root {
        --color-primary: #007bff;
        .some-class {
          color: red;
        }
      }`;

      expect(() => validateThemeCss(css)).toThrow(
        'Theme CSS contains nested blocks or additional selectors. Only CSS variable declarations are allowed inside :root { ... }.',
      );
    });
  });

  describe('invalid CSS - forbidden at-rules', () => {
    it.each([
      {
        description: '@import',
        css: `:root {
        @import url('other.css');
        --color-primary: #007bff;
      }`,
      },
      {
        description: '@media',
        css: `:root {
        --color-primary: #007bff;
        @media (max-width: 600px) {
          --color-primary: #ff0000;
        }
      }`,
      },
      {
        description: '@keyframes',
        css: `:root {
        --color-primary: #007bff;
        @keyframes fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      }`,
      },
    ])('should reject CSS with $description', ({ css }) => {
      expect(() => validateThemeCss(css)).toThrow(/forbidden at-rules/);
    });
  });

  describe('invalid CSS - non-CSS-variable properties', () => {
    it.each([
      {
        description: 'regular CSS properties',
        property: 'color',
        css: `:root {
        --color-primary: #007bff;
        color: red;
      }`,
      },
      {
        description: 'background property',
        property: 'background',
        css: `:root {
        background: #ffffff;
      }`,
      },
      {
        description: 'margin property',
        property: 'margin',
        css: `:root {
        --color-primary: #007bff;
        margin: 0;
      }`,
      },
    ])('should reject CSS with $description', ({ property, css }) => {
      expect(() => validateThemeCss(css)).toThrow(
        `Invalid property "${property}". Only CSS custom properties (starting with --) are allowed.`,
      );
    });
  });

  describe('invalid CSS - malformed declarations', () => {
    it('should reject CSS with missing colon', () => {
      const css = `:root {
        --color-primary #007bff;
      }`;

      expect(() => validateThemeCss(css)).toThrow(
        'Invalid CSS declaration: "--color-primary #007bff"',
      );
    });

    it('should accept CSS with missing semicolon on the last declaration', () => {
      const css = `:root {
        --color-primary: #007bff;
        --color-secondary: #6c757d
      }`;

      // CSS doesn't require a semicolon for the last declaration, so this should pass
      expect(() => validateThemeCss(css)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle CSS with only comments', () => {
      const css = `:root {
        /* Comment only */
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should preserve original CSS format in return value', () => {
      const css = `:root {
        --color-primary: #007bff;
        --color-secondary: #6c757d;
      }`;

      const result = validateThemeCss(css);
      expect(result).toBe(css.trim());
    });

    it('should handle CSS with extra whitespace', () => {
      const css = `  :root {
        --color-primary: #007bff;
      }  `;

      const result = validateThemeCss(css);
      expect(result).toBe(css.trim());
    });

    it.each([
      {
        description: 'empty string',
        css: '',
      },
      {
        description: 'whitespace only',
        css: '   ',
      },
    ])('should reject $description', ({ css }) => {
      expect(() => validateThemeCss(css)).toThrow(
        'Theme CSS must contain :root { ... } with CSS variable definitions. No other selectors or content allowed.',
      );
    });
  });

  describe('invalid CSS - dangerous property values (XSS prevention)', () => {
    describe('URL functions - should reject all url() functions', () => {
      it.each([
        {
          description: 'javascript: protocol in url()',
          css: `:root {
        --bg-image: url("javascript:alert(1)");
      }`,
        },
        {
          description: 'javascript: protocol without quotes',
          css: `:root {
        --bg-image: url(javascript:alert(1));
      }`,
        },
        {
          description: 'javascript: protocol in single quotes',
          css: `:root {
        --bg-image: url('javascript:alert(document.cookie)');
      }`,
        },
        {
          description: 'javascript: protocol with case variations',
          css: `:root {
        --bg-image: url("JaVaScRiPt:alert(1)");
      }`,
        },
        {
          description: 'javascript: protocol with encoded characters',
          css: `:root {
        --bg-image: url("javascript%3Aalert(1)");
      }`,
        },
        {
          description: 'data: URL containing JavaScript',
          css: `:root {
        --bg-image: url("data:text/html,<script>alert(1)</script>");
      }`,
        },
        {
          description: 'data: URL containing iframe',
          css: `:root {
        --bg-image: url("data:text/html,<iframe src=javascript:alert(1)></iframe>");
      }`,
        },
        {
          description: 'vbscript: protocol',
          css: `:root {
        --bg-image: url("vbscript:msgbox(1)");
      }`,
        },
        {
          description: 'external HTTP URL',
          css: `:root {
        --bg-image: url("http://example.com/image.png");
      }`,
        },
        {
          description: 'external HTTPS URL',
          css: `:root {
        --bg-image: url("https://example.com/image.png");
      }`,
        },
        {
          description: 'protocol-relative URL',
          css: `:root {
        --bg-image: url("//example.com/image.png");
      }`,
        },
        {
          description: 'local relative URL',
          css: `:root {
        --bg-image: url("./image.png");
      }`,
        },
        {
          description: 'parent directory relative URL',
          css: `:root {
        --bg-image: url("../images/bg.png");
      }`,
        },
        {
          description: 'simple filename',
          css: `:root {
        --bg-image: url("image.png");
      }`,
        },
        {
          description: 'absolute path',
          css: `:root {
        --bg-image: url("/images/bg.png");
      }`,
        },
        {
          description: 'unquoted URL',
          css: `:root {
        --bg-image: url(image.png);
      }`,
        },
        {
          description: 'single-quoted local URL',
          css: `:root {
        --bg-image: url('./image.png');
      }`,
        },
        {
          description: 'data URL',
          css: `:root {
        --bg-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==");
      }`,
        },
        {
          description: 'JavaScript URL in multiline format',
          css: `:root {
        --bg-image: url(
          "javascript:alert(1)"
        );
      }`,
        },
      ])('should reject CSS with $description', ({ css }) => {
        expect(() => validateThemeCss(css)).toThrow();
      });
    });

    it.each([
      {
        description: 'javascript: protocol in value without url()',
        css: `:root {
        --color-primary: javascript:alert(1);
      }`,
      },
      {
        description: 'expression() function (IE XSS)',
        css: `:root {
        --bg-image: expression(alert(1));
      }`,
      },
      {
        description: '-moz-binding (Firefox XSS)',
        css: `:root {
        --bg-image: -moz-binding(url("data:text/xml;charset=utf-8,<x></x>"));
      }`,
      },
      {
        description: 'behavior property',
        css: `:root {
        --behavior: url("data:text/xml;charset=utf-8,<x></x>");
      }`,
      },
      {
        description: 'multiple dangerous patterns',
        css: `:root {
        --bg-image: url("javascript:alert(1)");
        --color-primary: #007bff;
        --bg-image2: url("http://evil.com/image.png");
      }`,
      },
      {
        description: 'encoded JavaScript URL',
        css: `:root {
        --bg-image: url("\\6a\\61\\76\\61\\73\\63\\72\\69\\70\\74\\3a\\61\\6c\\65\\72\\74\\28\\31\\29");
      }`,
      },
      {
        description: '<script> tag in value',
        css: `:root {
        --color-primary: <script>alert(1)</script>;
      }`,
      },
      {
        description: 'onerror event handler in value',
        css: `:root {
        --bg-image: url("x" onerror="alert(1)");
      }`,
      },
    ])('should reject CSS with $description', ({ css }) => {
      expect(() => validateThemeCss(css)).toThrow();
    });
  });

  describe('invalid CSS - function calls (security)', () => {
    describe('var() function - should accept var(--name) only (no fallbacks)', () => {
      it.each([
        {
          description: 'simple var() call',
          css: `:root {
        --color-primary: var(--other-var);
      }`,
        },
        {
          description: 'var() with whitespace',
          css: `:root {
        --color-primary: var( --other-var );
      }`,
        },
        {
          description: 'var() in uppercase',
          css: `:root {
        --color-primary: VAR(--other-var);
      }`,
        },
        {
          description: 'var() with mixed case',
          css: `:root {
        --color-primary: VaR(--other-var);
      }`,
        },
      ])('should accept CSS with $description', ({ css }) => {
        expect(() => validateThemeCss(css)).not.toThrow();
      });
    });

    describe('var() function - should reject var() with fallback or invalid form', () => {
      it.each([
        {
          description: 'var() with fallback',
          css: `:root {
        --color-primary: var(--other-var, #007bff);
      }`,
        },
        {
          description: 'var() with invalid variable name (no --)',
          css: `:root {
        --color-primary: var(not-a-custom-prop);
      }`,
        },
        {
          description: 'var() with empty variable name',
          css: `:root {
        --color-primary: var(--);
      }`,
        },
        {
          description: 'var() with unbalanced parentheses',
          css: `:root {
        --color-primary: var(--other-var;
      }`,
        },
      ])('should reject CSS with $description', ({ css }) => {
        expect(() => validateThemeCss(css)).toThrow();
      });
    });

    describe('other function calls - should reject all except rgb/rgba/hsl/hsla and var()', () => {
      it.each([
        {
          description: 'calc() function',
          css: `:root {
        --spacing: calc(10px + 5px);
      }`,
        },
        {
          description: 'min() function',
          css: `:root {
        --width: min(100px, 50%);
      }`,
        },
        {
          description: 'max() function',
          css: `:root {
        --width: max(100px, 50%);
      }`,
        },
        {
          description: 'clamp() function',
          css: `:root {
        --width: clamp(100px, 50%, 200px);
      }`,
        },
        {
          description: 'linear-gradient() function',
          css: `:root {
        --bg: linear-gradient(red, blue);
      }`,
        },
        {
          description: 'rgba() with calc inside (nested function)',
          css: `:root {
        --color: rgba(calc(255), 0, 0, 1);
      }`,
        },
        {
          description: 'attr() function',
          css: `:root {
        --content: attr(data-value);
      }`,
        },
        {
          description: 'counter() function',
          css: `:root {
        --counter: counter(my-counter);
      }`,
        },
        {
          description:
            'url() function (already tested but included for completeness)',
          css: `:root {
        --bg: url("image.png");
      }`,
        },
      ])('should reject CSS with $description', ({ css }) => {
        expect(() => validateThemeCss(css)).toThrow();
      });
    });

    it('should allow rgb() function', () => {
      const css = `:root {
        --color-primary: rgb(0, 123, 255);
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should allow rgba() function', () => {
      const css = `:root {
        --color-primary: rgba(0, 123, 255, 0.5);
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should allow hsl() function', () => {
      const css = `:root {
        --color-primary: hsl(210, 100%, 50%);
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should allow hsla() function', () => {
      const css = `:root {
        --color-primary: hsla(210, 100%, 50%, 0.5);
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });
  });

  describe('valid CSS - CSS keywords', () => {
    it.each([
      {
        description: 'transparent keyword',
        css: `:root {
        --color-primary: transparent;
      }`,
      },
      {
        description: 'initial keyword',
        css: `:root {
        --color-primary: initial;
      }`,
      },
      {
        description: 'inherit keyword',
        css: `:root {
        --color-primary: inherit;
      }`,
      },
      {
        description: 'auto keyword',
        css: `:root {
        --spacing: auto;
      }`,
      },
      {
        description: 'unset keyword',
        css: `:root {
        --color-primary: unset;
      }`,
      },
      {
        description: 'revert keyword',
        css: `:root {
        --color-primary: revert;
      }`,
      },
      {
        description: 'none keyword',
        css: `:root {
        --border: none;
      }`,
      },
      {
        description: 'normal keyword',
        css: `:root {
        --font-weight: normal;
      }`,
      },
      {
        description: 'keywords with mixed case',
        css: `:root {
        --color-primary: TRANSPARENT;
        --color-secondary: InHeRiT;
        --spacing: AuTo;
      }`,
      },
      {
        description: 'multiple keywords in different properties',
        css: `:root {
        --color-primary: transparent;
        --color-secondary: initial;
        --spacing: auto;
        --border: none;
      }`,
      },
    ])('should allow CSS with $description', ({ css }) => {
      expect(() => validateThemeCss(css)).not.toThrow();
    });
  });

  describe('invalid CSS - additional at-rules', () => {
    it.each([
      {
        description: '@namespace',
        css: `:root {
        @namespace url("http://www.w3.org/1999/xhtml");
        --color-primary: #007bff;
      }`,
      },
      {
        description: '@page',
        css: `:root {
        @page {
          margin: 1cm;
        }
        --color-primary: #007bff;
      }`,
      },
      {
        description: '@layer',
        css: `:root {
        @layer base {
          --color-primary: #007bff;
        }
      }`,
      },
      {
        description: '@container',
        css: `:root {
        @container (max-width: 600px) {
          --color-primary: #007bff;
        }
      }`,
      },
      {
        description: '@scope',
        css: `:root {
        @scope (.parent) {
          --color-primary: #007bff;
        }
      }`,
      },
      {
        description: '@starting-style',
        css: `:root {
        @starting-style {
          --color-primary: #007bff;
        }
      }`,
      },
      {
        description: '@property',
        css: `:root {
        @property --custom-color {
          syntax: '<color>';
          inherits: false;
        }
        --color-primary: #007bff;
      }`,
      },
      {
        description: '@font-palette-values',
        css: `:root {
        @font-palette-values {
          --color-primary: #007bff;
        }
      }`,
      },
    ])('should reject CSS with $description', ({ css }) => {
      expect(() => validateThemeCss(css)).toThrow(/forbidden at-rules/);
    });
  });

  describe('invalid CSS - parsing edge cases and potential vulnerabilities', () => {
    it.each([
      {
        description: 'quoted strings in value (should be rejected)',
        css: `:root {
        --color-primary: "red";
      }`,
      },
      {
        description: 'single-quoted strings in value (should be rejected)',
        css: `:root {
        --color-primary: 'red';
      }`,
      },
      {
        description: 'value with multiple spaces',
        css: `:root {
        --spacing: 10px  20px;
      }`,
      },
      {
        description: 'property name with invalid characters',
        css: `:root {
        --color[primary]: #007bff;
      }`,
      },
      {
        description: 'property name ending with dash',
        css: `:root {
        --color-primary-: #007bff;
      }`,
      },
      {
        description: 'value starting with special character',
        css: `:root {
        --value: !important;
      }`,
      },
      {
        description: 'value with backslash escapes',
        css: `:root {
        --value: \\00;
      }`,
      },
      {
        description: 'unicode escape sequences',
        css: `:root {
        --value: \\6A\\61\\76\\61\\73\\63\\72\\69\\70\\74;
      }`,
      },
      {
        description: 'value with newline characters',
        css: `:root {
        --value: 10px\n20px;
      }`,
      },
      {
        description: 'value with tab characters',
        css: `:root {
        --value: 10px\t20px;
      }`,
      },
      {
        description: 'empty property name',
        css: `:root {
        --: #007bff;
      }`,
      },
      {
        description: 'property with only dashes',
        css: `:root {
        ----: #007bff;
      }`,
      },
      {
        description: 'multiple colons in declaration',
        css: `:root {
        --color-primary: rgb(255: 0: 0);
      }`,
      },
    ])('should reject CSS with $description', ({ css }) => {
      expect(() => validateThemeCss(css)).toThrow();
    });

    it('should handle CSS with valid values containing spaces in allowed contexts', () => {
      // RGB values with spaces are allowed
      const css = `:root {
        --color-primary: rgb( 0 , 123 , 255 );
      }`;

      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should reject CSS with value containing parentheses outside allowed functions', () => {
      const css = `:root {
        --value: (something);
      }`;

      expect(() => validateThemeCss(css)).toThrow();
    });
  });
});

describe('validateThemeCss - font properties (--font-*)', () => {
  describe('valid font-family values', () => {
    it.each([
      {
        description: 'single generic family',
        css: `:root { --font-family: sans-serif; }`,
      },
      {
        description: 'single generic family (serif)',
        css: `:root { --font-family: serif; }`,
      },
      {
        description: 'single generic family (monospace)',
        css: `:root { --font-family: monospace; }`,
      },
      {
        description: 'system-ui keyword',
        css: `:root { --font-family: system-ui; }`,
      },
      {
        description: 'bundled font (Inter Variable)',
        css: `:root { --font-family: Inter Variable; }`,
      },
      {
        description: 'quoted bundled font',
        css: `:root { --font-family: 'Inter Variable'; }`,
      },
      {
        description: 'double-quoted bundled font',
        css: `:root { --font-family: "Inter Variable"; }`,
      },
      {
        description: 'web-safe font (Georgia)',
        css: `:root { --font-family: Georgia; }`,
      },
      {
        description: 'web-safe font (Times New Roman) quoted',
        css: `:root { --font-family: 'Times New Roman'; }`,
      },
      {
        description: 'comma-separated font stack',
        css: `:root { --font-family: Georgia, serif; }`,
      },
      {
        description: 'full font stack with multiple fonts',
        css: `:root { --font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }`,
      },
      {
        description: 'monospace font stack',
        css: `:root { --font-mono: 'Fira Code', Consolas, Monaco, monospace; }`,
      },
      {
        description: 'case-insensitive matching (arial)',
        css: `:root { --font-family: arial; }`,
      },
      {
        description: 'case-insensitive matching (GEORGIA)',
        css: `:root { --font-family: GEORGIA; }`,
      },
      {
        description: 'macOS system font',
        css: `:root { --font-family: 'SF Pro', -apple-system, sans-serif; }`,
      },
      {
        description: 'mixed with color variables',
        css: `:root {
        --color-primary: #007bff;
        --font-family: Georgia, serif;
        --color-secondary: #6c757d;
      }`,
      },
      {
        description: '--font-mono property',
        css: `:root { --font-mono: 'JetBrains Mono', 'Fira Code', monospace; }`,
      },
      {
        description: '--font-heading property',
        css: `:root { --font-heading: Palatino, 'Book Antiqua', serif; }`,
      },
    ])('should accept CSS with $description', ({ css }) => {
      expect(() => validateThemeCss(css)).not.toThrow();
    });
  });

  describe('invalid font-family values - security', () => {
    it.each([
      {
        description: 'empty value',
        css: `:root { --font-family: ; }`,
        expectedPattern: /value must not be empty/,
      },
      {
        description: 'url() function in font value',
        css: `:root { --font-family: url('https://evil.com/font.woff2'); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'url() with data: URI',
        css: `:root { --font-family: url(data:font/woff2;base64,abc123); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'expression() in font value',
        css: `:root { --font-family: expression(alert(1)); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'empty font name between commas',
        css: `:root { --font-family: Arial, , sans-serif; }`,
        expectedPattern: /empty font name/,
      },
      {
        description: 'Google Fonts URL attempt',
        css: `:root { --font-family: url(https://fonts.googleapis.com/css2?family=Roboto); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'local() function',
        css: `:root { --font-family: local(Arial); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'format() function',
        css: `:root { --font-family: format('woff2'); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'rgb() function in font property',
        css: `:root { --font-family: rgb(0, 0, 0); }`,
        expectedPattern: /function calls are not allowed/,
      },
    ])('should reject CSS with $description', ({ css, expectedPattern }) => {
      expect(() => validateThemeCss(css)).toThrow(expectedPattern);
    });
  });

  describe('any font name is valid (no allowlist)', () => {
    it.each([
      {
        description: 'Comic Sans MS',
        css: `:root { --font-family: 'Comic Sans MS'; }`,
      },
      {
        description: 'custom font name',
        css: `:root { --font-family: 'My Custom Font', sans-serif; }`,
      },
      {
        description: 'arbitrary string',
        css: `:root { --font-family: something-random; }`,
      },
      { description: 'Papyrus', css: `:root { --font-family: Papyrus; }` },
    ])('should accept $description as a font name', ({ css }) => {
      expect(() => validateThemeCss(css)).not.toThrow();
    });
  });
});

describe('validateThemeCss - @font-face blocks', () => {
  describe('valid @font-face with data: URIs', () => {
    it('should accept @font-face with data: URI and :root', () => {
      const css = `${FONT_FACE_BLOCK}
:root { --font-family: 'Test Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept multiple @font-face blocks', () => {
      const css = `@font-face {
  font-family: 'Test Font';
  src: url('${TINY_WOFF2_DATA_URI}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Test Font';
  src: url('${TINY_WOFF2_DATA_URI}') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
:root { --font-family: 'Test Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept @font-face with font/woff MIME type', () => {
      const css = `@font-face {
  font-family: 'Woff Font';
  src: url('data:font/woff;base64,${TINY_WOFF2_BASE64}') format('woff');
}
:root { --font-family: 'Woff Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept @font-face with font/ttf MIME type', () => {
      const css = `@font-face {
  font-family: 'TTF Font';
  src: url('data:font/ttf;base64,${TINY_WOFF2_BASE64}') format('truetype');
}
:root { --font-family: 'TTF Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept @font-face with application/font-woff2 MIME type', () => {
      const css = `@font-face {
  font-family: 'App Font';
  src: url('data:application/font-woff2;base64,${TINY_WOFF2_BASE64}') format('woff2');
}
:root { --font-family: 'App Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept @font-face with font-stretch', () => {
      const css = `@font-face {
  font-family: 'Stretch Font';
  src: url('${TINY_WOFF2_DATA_URI}') format('woff2');
  font-stretch: condensed;
}
:root { --font-family: 'Stretch Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept @font-face with unicode-range', () => {
      const css = `@font-face {
  font-family: 'Unicode Font';
  src: url('${TINY_WOFF2_DATA_URI}') format('woff2');
  unicode-range: U+0000-00FF;
}
:root { --font-family: 'Unicode Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should allow custom font name in --font-family after @font-face declaration', () => {
      const css = `@font-face {
  font-family: 'My Custom Font';
  src: url('${TINY_WOFF2_DATA_URI}') format('woff2');
}
:root { --font-family: 'My Custom Font', Georgia, serif; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should accept @font-face alongside color variables', () => {
      const css = `${FONT_FACE_BLOCK}
:root {
  --color-primary: #007bff;
  --font-family: 'Test Font', sans-serif;
  --color-secondary: #6c757d;
}`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });
  });

  describe('invalid @font-face - security', () => {
    it('should reject @font-face with remote HTTP URL', () => {
      const css = `@font-face {
  font-family: 'Bad Font';
  src: url('https://evil.com/font.woff2') format('woff2');
}
:root { --font-family: 'Bad Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).toThrow(/data: URIs/);
    });

    it('should reject @font-face with remote HTTPS URL', () => {
      const css = `@font-face {
  font-family: 'Bad Font';
  src: url('https://fonts.example.com/custom.woff2') format('woff2');
}
:root { --font-family: 'Bad Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).toThrow(/data: URIs/);
    });

    it('should reject @font-face with relative URL (not embedded)', () => {
      const css = `@font-face {
  font-family: 'Bad Font';
  src: url('./fonts/custom.woff2') format('woff2');
}
:root { --font-family: 'Bad Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).toThrow(/data: URIs/);
    });

    it('should reject @font-face with javascript: protocol', () => {
      const css = `@font-face {
  font-family: 'Bad Font';
  src: url('javascript:alert(1)');
}
:root { --font-family: 'Bad Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).toThrow(/data: URIs/);
    });

    it('should accept any font name in --font-family (no allowlist)', () => {
      const css = `@font-face {
  font-family: 'Declared Font';
  src: url('${TINY_WOFF2_DATA_URI}') format('woff2');
}
:root { --font-family: 'Undeclared Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should reject oversized font data', () => {
      // Create a base64 string that would decode to > MAX_FONT_FILE_SIZE
      const oversizedBase64 = 'A'.repeat(
        Math.ceil((MAX_FONT_FILE_SIZE * 4) / 3) + 100,
      );
      const css = `@font-face {
  font-family: 'Big Font';
  src: url('data:font/woff2;base64,${oversizedBase64}') format('woff2');
}
:root { --font-family: 'Big Font', sans-serif; }`;
      expect(() => validateThemeCss(css)).toThrow(/maximum size/);
    });
  });

  describe('CSS without @font-face still works', () => {
    it('should accept plain :root without @font-face', () => {
      const css = `:root { --color-primary: #007bff; }`;
      expect(() => validateThemeCss(css)).not.toThrow();
    });

    it('should reject other at-rules (not @font-face)', () => {
      const css = `@import url('other.css');
:root { --color-primary: #007bff; }`;
      expect(() => validateThemeCss(css)).toThrow();
    });

    it('should reject @media outside :root', () => {
      const css = `@media (max-width: 600px) { :root { --color-primary: #ff0000; } }
:root { --color-primary: #007bff; }`;
      expect(() => validateThemeCss(css)).toThrow();
    });
  });
});

describe('parseInstalledTheme', () => {
  describe('valid theme JSON', () => {
    it('should parse valid theme with all required fields', () => {
      const theme: InstalledTheme = {
        id: 'theme-abc123',
        name: 'My Theme',
        repo: 'owner/repo',
        cssContent: ':root { --color-primary: #007bff; }',
      };
      const json = JSON.stringify(theme);

      const result = parseInstalledTheme(json);

      expect(result).toEqual(theme);
      expect(result?.id).toBe('theme-abc123');
      expect(result?.name).toBe('My Theme');
      expect(result?.cssContent).toBe(':root { --color-primary: #007bff; }');
    });

    it('should parse theme with additional fields', () => {
      const theme = {
        id: 'theme-xyz789',
        name: 'Extended Theme',
        repo: 'owner/repo',
        cssContent: ':root { --color-primary: #007bff; }',
        extraField: 'should be ignored',
        version: 1,
      };
      const json = JSON.stringify(theme);

      const result = parseInstalledTheme(json);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('theme-xyz789');
      expect(result?.name).toBe('Extended Theme');
      expect(result?.cssContent).toBe(':root { --color-primary: #007bff; }');
    });

    it('should parse theme with empty string fields', () => {
      const theme: InstalledTheme = {
        id: '',
        name: '',
        repo: 'owner/repo',
        cssContent: '',
      };
      const json = JSON.stringify(theme);

      const result = parseInstalledTheme(json);

      expect(result).toEqual(theme);
      expect(result?.id).toBe('');
      expect(result?.name).toBe('');
      expect(result?.cssContent).toBe('');
    });
  });

  describe('missing required fields', () => {
    it.each([
      {
        description: 'id is missing',
        theme: {
          name: 'My Theme',
          repo: 'owner/repo',
          cssContent: ':root { --color-primary: #007bff; }',
        },
      },
      {
        description: 'name is missing',
        theme: {
          id: 'theme-abc123',
          repo: 'owner/repo',
          cssContent: ':root { --color-primary: #007bff; }',
        },
      },
      {
        description: 'cssContent is missing',
        theme: {
          id: 'theme-abc123',
          name: 'My Theme',
          repo: 'owner/repo',
        },
      },
    ])('should return null when $description', ({ theme }) => {
      const json = JSON.stringify(theme);
      const result = parseInstalledTheme(json);
      expect(result).toBeNull();
    });
  });

  describe('invalid field types', () => {
    it.each([
      {
        description: 'id is not a string',
        theme: {
          id: 123,
          name: 'My Theme',
          repo: 'owner/repo',
          cssContent: ':root { --color-primary: #007bff; }',
        },
      },
      {
        description: 'id is null',
        theme: {
          id: null,
          name: 'My Theme',
          repo: 'owner/repo',
          cssContent: ':root { --color-primary: #007bff; }',
        },
      },
      {
        description: 'id is an object',
        theme: {
          id: { value: 'theme-abc123' },
          name: 'My Theme',
          repo: 'owner/repo',
          cssContent: ':root { --color-primary: #007bff; }',
        },
      },
      {
        description: 'name is not a string',
        theme: {
          id: 'theme-abc123',
          name: 456,
          repo: 'owner/repo',
          cssContent: ':root { --color-primary: #007bff; }',
        },
      },
      {
        description: 'name is null',
        theme: {
          id: 'theme-abc123',
          name: null,
          repo: 'owner/repo',
          cssContent: ':root { --color-primary: #007bff; }',
        },
      },
      {
        description: 'cssContent is not a string',
        theme: {
          id: 'theme-abc123',
          name: 'My Theme',
          repo: 'owner/repo',
          cssContent: { content: ':root { --color-primary: #007bff; }' },
        },
      },
      {
        description: 'cssContent is null',
        theme: {
          id: 'theme-abc123',
          name: 'My Theme',
          repo: 'owner/repo',
          cssContent: null,
        },
      },
      {
        description: 'cssContent is a number',
        theme: {
          id: 'theme-abc123',
          name: 'My Theme',
          repo: 'owner/repo',
          cssContent: 12345,
        },
      },
    ])('should return null when $description', ({ theme }) => {
      const json = JSON.stringify(theme);
      const result = parseInstalledTheme(json);
      expect(result).toBeNull();
    });
  });

  describe('invalid JSON structure', () => {
    it.each([
      {
        description: 'parsed value is null',
        json: JSON.stringify(null),
      },
      {
        description: 'parsed value is not an object',
        json: JSON.stringify('not an object'),
      },
      {
        description: 'parsed value is an array',
        json: JSON.stringify([
          {
            id: 'theme-abc123',
            name: 'My Theme',
            repo: 'owner/repo',
            cssContent: ':root { --color-primary: #007bff; }',
          },
        ]),
      },
      {
        description: 'parsed value is a number',
        json: JSON.stringify(42),
      },
      {
        description: 'parsed value is a boolean',
        json: JSON.stringify(true),
      },
    ])('should return null when $description', ({ json }) => {
      const result = parseInstalledTheme(json);
      expect(result).toBeNull();
    });
  });

  describe('invalid JSON string', () => {
    it.each([
      {
        description: 'malformed JSON',
        json: '{ invalid json }',
      },
      {
        description: 'incomplete JSON',
        json: '{"id": "theme-abc123", "name":',
      },
      {
        description: 'empty object',
        json: '{}',
      },
    ])('should return null for $description', ({ json }) => {
      const result = parseInstalledTheme(json);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it.each([
      {
        description: 'undefined input',
        input: undefined as undefined,
      },
      {
        description: 'empty string',
        input: '',
      },
      {
        description: 'whitespace-only string',
        input: '   ',
      },
      {
        description:
          'empty array (parsed value should be distinguished from object)',
        input: '[]',
      },
    ])('should return null for $description', ({ input }) => {
      const result = parseInstalledTheme(input);
      expect(result).toBeNull();
    });

    it('should handle theme with all fields including optional repo', () => {
      const theme: InstalledTheme = {
        id: 'theme-full',
        name: 'Full Theme',
        repo: 'owner/repo',
        cssContent: ':root { --color-primary: #007bff; }',
      };
      const json = JSON.stringify(theme);

      const result = parseInstalledTheme(json);

      expect(result).toEqual(theme);
      expect(result?.repo).toBe('owner/repo');
    });
  });
});

describe('embedThemeFonts', () => {
  const mockFetch = (
    responseBody: ArrayBuffer,
    ok = true,
    status = 200,
  ): typeof globalThis.fetch =>
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? 'OK' : 'Not Found',
      arrayBuffer: () => Promise.resolve(responseBody),
    } as Partial<Response>);

  const tinyBuffer = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]).buffer;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should rewrite url() references to data URIs', async () => {
    vi.stubGlobal('fetch', mockFetch(tinyBuffer));

    const css = `@font-face {
  font-family: 'Test';
  src: url('fonts/test.woff2') format('woff2');
}
:root { --color-primary: #007bff; }`;

    const result = await embedThemeFonts(css, 'owner/repo');
    expect(result).toContain('data:font/woff2;base64,');
    expect(result).not.toContain('fonts/test.woff2');
    expect(result).toContain(':root');
  });

  it('should handle quoted filenames with spaces', async () => {
    vi.stubGlobal('fetch', mockFetch(tinyBuffer));

    const css = `@font-face {
  font-family: 'Inter';
  src: url("Inter Variable.woff2") format('woff2');
}
:root { --color-primary: #007bff; }`;

    const result = await embedThemeFonts(css, 'owner/repo');
    expect(result).toContain('data:font/woff2;base64,');
    expect(result).not.toContain('Inter Variable.woff2');
  });

  it('should reject path traversal with ".."', async () => {
    const css = `@font-face {
  font-family: 'Evil';
  src: url('../escape/font.woff2') format('woff2');
}
:root { --color-primary: #007bff; }`;

    await expect(embedThemeFonts(css, 'owner/repo')).rejects.toThrow(
      'is not allowed',
    );
  });

  it('should reject root-anchored paths', async () => {
    const css = `@font-face {
  font-family: 'Evil';
  src: url('/etc/passwd') format('woff2');
}
:root { --color-primary: #007bff; }`;

    await expect(embedThemeFonts(css, 'owner/repo')).rejects.toThrow(
      'is not allowed',
    );
  });

  it('should reject oversized font files', async () => {
    const oversized = new ArrayBuffer(MAX_FONT_FILE_SIZE + 1);
    vi.stubGlobal('fetch', mockFetch(oversized));

    const css = `@font-face {
  font-family: 'Big';
  src: url('big.woff2') format('woff2');
}
:root { --color-primary: #007bff; }`;

    await expect(embedThemeFonts(css, 'owner/repo')).rejects.toThrow(
      'exceeds maximum size',
    );
  });

  it('should reject when total font size exceeds budget', async () => {
    // Each font is under the per-file limit but together they exceed the total
    // Use MAX_FONT_FILE_SIZE (2MB) per font, need 6 to exceed 10MB total
    const bigBuffer = new ArrayBuffer(MAX_FONT_FILE_SIZE);
    vi.stubGlobal('fetch', mockFetch(bigBuffer));

    const fontBlocks = Array.from(
      { length: 6 },
      (_, i) => `@font-face {
  font-family: 'Font${i}';
  src: url('font${i}.woff2') format('woff2');
}`,
    ).join('\n');
    const css = `${fontBlocks}\n:root { --color-primary: #007bff; }`;

    await expect(embedThemeFonts(css, 'owner/repo')).rejects.toThrow(
      'Total embedded font data exceeds maximum',
    );
  });

  it('should return CSS unchanged when no url() refs exist', async () => {
    const css = `@font-face {
  font-family: 'Test';
  src: url('${TINY_WOFF2_DATA_URI}') format('woff2');
}
:root { --color-primary: #007bff; }`;

    const result = await embedThemeFonts(css, 'owner/repo');
    expect(result).toBe(css);
  });
});
