// oxlint-disable eslint/no-script-url
import { describe, it, expect } from 'vitest';

import {
  validateThemeCss,
  parseInstalledTheme,
  type InstalledTheme,
} from './customThemes';

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
      expect(() => validateThemeCss(css)).toThrow(
        'Theme CSS contains forbidden at-rules (@import, @media, etc.). Only CSS variable declarations are allowed.',
      );
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
