// oxlint-disable eslint/no-script-url
import { describe, expect, it } from 'vitest';

import {
  parseInstalledTheme,
  SAFE_FONT_FAMILIES,
  validateThemeCss,
} from './customThemes';
import type { InstalledTheme } from './customThemes';

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
        'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
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
          'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
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
          'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
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
          'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
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
          'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
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
        'Theme CSS must contain exactly :root { ... } with CSS variable definitions. No other selectors or content allowed.',
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
        css: `:root { --font-body: sans-serif; }`,
      },
      {
        description: 'single generic family (serif)',
        css: `:root { --font-body: serif; }`,
      },
      {
        description: 'single generic family (monospace)',
        css: `:root { --font-body: monospace; }`,
      },
      {
        description: 'system-ui keyword',
        css: `:root { --font-body: system-ui; }`,
      },
      {
        description: 'bundled font (Inter Variable)',
        css: `:root { --font-body: Inter Variable; }`,
      },
      {
        description: 'quoted bundled font',
        css: `:root { --font-body: 'Inter Variable'; }`,
      },
      {
        description: 'double-quoted bundled font',
        css: `:root { --font-body: "Inter Variable"; }`,
      },
      {
        description: 'web-safe font (Georgia)',
        css: `:root { --font-body: Georgia; }`,
      },
      {
        description: 'web-safe font (Times New Roman) quoted',
        css: `:root { --font-body: 'Times New Roman'; }`,
      },
      {
        description: 'comma-separated font stack',
        css: `:root { --font-body: Georgia, serif; }`,
      },
      {
        description: 'full font stack with multiple fonts',
        css: `:root { --font-body: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }`,
      },
      {
        description: 'monospace font stack',
        css: `:root { --font-mono: 'Fira Code', Consolas, Monaco, monospace; }`,
      },
      {
        description: 'case-insensitive matching (arial)',
        css: `:root { --font-body: arial; }`,
      },
      {
        description: 'case-insensitive matching (GEORGIA)',
        css: `:root { --font-body: GEORGIA; }`,
      },
      {
        description: 'macOS system font',
        css: `:root { --font-body: 'SF Pro', -apple-system, sans-serif; }`,
      },
      {
        description: 'mixed with color variables',
        css: `:root {
        --color-primary: #007bff;
        --font-body: Georgia, serif;
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
      {
        description: 'empty value',
        css: `:root { --font-body: ; }`,
      },
    ])('should accept CSS with $description', ({ css }) => {
      expect(() => validateThemeCss(css)).not.toThrow();
    });
  });

  describe('invalid font-family values - security', () => {
    it.each([
      {
        description: 'unknown/external font name',
        css: `:root { --font-body: 'Comic Sans MS'; }`,
        expectedPattern: /Only safe system and web-safe fonts are allowed/,
      },
      {
        description: 'url() function in font value',
        css: `:root { --font-body: url('https://evil.com/font.woff2'); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'url() with data: URI',
        css: `:root { --font-body: url(data:font/woff2;base64,abc123); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'javascript: in font value',
        css: `:root { --font-body: javascript:alert(1); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'expression() in font value',
        css: `:root { --font-body: expression(alert(1)); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'font with unknown name in stack',
        css: `:root { --font-body: 'My Custom Font', sans-serif; }`,
        expectedPattern: /Only safe system and web-safe fonts are allowed/,
      },
      {
        description: 'empty font name between commas',
        css: `:root { --font-body: Arial, , sans-serif; }`,
        expectedPattern: /empty font name/,
      },
      {
        description: 'random string that is not a font',
        css: `:root { --font-body: something-random; }`,
        expectedPattern: /Only safe system and web-safe fonts are allowed/,
      },
      {
        description: 'Google Fonts URL attempt',
        css: `:root { --font-body: url(https://fonts.googleapis.com/css2?family=Roboto); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'local() function',
        css: `:root { --font-body: local(Arial); }`,
        expectedPattern: /function calls are not allowed/,
      },
      {
        description: 'format() function',
        css: `:root { --font-body: format('woff2'); }`,
        expectedPattern: /function calls are not allowed/,
      },
    ])('should reject CSS with $description', ({ css, expectedPattern }) => {
      expect(() => validateThemeCss(css)).toThrow(expectedPattern);
    });
  });

  describe('font properties do not accept color-style values', () => {
    it('should reject hex color in font property', () => {
      const css = `:root { --font-body: #007bff; }`;
      expect(() => validateThemeCss(css)).toThrow(
        /Only safe system and web-safe fonts are allowed/,
      );
    });

    it('should reject rgb() in font property', () => {
      const css = `:root { --font-body: rgb(0, 0, 0); }`;
      expect(() => validateThemeCss(css)).toThrow(/function calls/);
    });
  });

  describe('SAFE_FONT_FAMILIES allowlist', () => {
    it('should contain common generic families', () => {
      expect(SAFE_FONT_FAMILIES.has('sans-serif')).toBe(true);
      expect(SAFE_FONT_FAMILIES.has('serif')).toBe(true);
      expect(SAFE_FONT_FAMILIES.has('monospace')).toBe(true);
      expect(SAFE_FONT_FAMILIES.has('system-ui')).toBe(true);
    });

    it('should contain the bundled fonts', () => {
      expect(SAFE_FONT_FAMILIES.has('Inter Variable')).toBe(true);
      expect(SAFE_FONT_FAMILIES.has('Redacted Script')).toBe(true);
    });

    it('should contain common web-safe fonts', () => {
      expect(SAFE_FONT_FAMILIES.has('Arial')).toBe(true);
      expect(SAFE_FONT_FAMILIES.has('Georgia')).toBe(true);
      expect(SAFE_FONT_FAMILIES.has('Courier New')).toBe(true);
      expect(SAFE_FONT_FAMILIES.has('Verdana')).toBe(true);
    });

    it('should not contain arbitrary fonts', () => {
      expect(SAFE_FONT_FAMILIES.has('Comic Sans MS')).toBe(false);
      expect(SAFE_FONT_FAMILIES.has('Papyrus')).toBe(false);
      expect(SAFE_FONT_FAMILIES.has('My Custom Font')).toBe(false);
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
