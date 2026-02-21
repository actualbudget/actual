import { parseNotes } from './linkParser';

describe('linkParser', () => {
  describe('parseNotes', () => {
    describe('URL trailing punctuation handling', () => {
      it('should strip trailing period from https URL', () => {
        const result = parseNotes('Check out https://example.com.');
        const linkSegment = result.find(s => s.type === 'link');
        expect(linkSegment).toEqual({
          type: 'link',
          content: 'https://example.com',
          displayText: 'https://example.com',
          url: 'https://example.com',
          isFilePath: false,
        });
        // The period should remain as a text segment
        const lastSegment = result[result.length - 1];
        expect(lastSegment).toEqual({ type: 'text', content: '.' });
      });

      it('should strip trailing comma from https URL', () => {
        const result = parseNotes('Visit https://example.com, then continue.');
        const linkSegment = result.find(s => s.type === 'link');
        expect(linkSegment).toEqual({
          type: 'link',
          content: 'https://example.com',
          displayText: 'https://example.com',
          url: 'https://example.com',
          isFilePath: false,
        });
      });

      it('should strip trailing punctuation from www URL', () => {
        const result = parseNotes('Go to www.example.com!');
        const linkSegment = result.find(s => s.type === 'link');
        expect(linkSegment).toEqual({
          type: 'link',
          content: 'www.example.com',
          displayText: 'www.example.com',
          url: 'www.example.com',
          isFilePath: false,
        });
        // The exclamation mark should remain as a text segment
        const lastSegment = result[result.length - 1];
        expect(lastSegment).toEqual({ type: 'text', content: '!' });
      });

      it('should strip multiple trailing punctuation characters', () => {
        const result = parseNotes('See https://example.com/path?query=1).');
        const linkSegment = result.find(s => s.type === 'link');
        expect(linkSegment).toEqual({
          type: 'link',
          content: 'https://example.com/path?query=1',
          displayText: 'https://example.com/path?query=1',
          url: 'https://example.com/path?query=1',
          isFilePath: false,
        });
      });

      it('should strip trailing quotes from URL', () => {
        const result = parseNotes('Link: "https://example.com"');
        const linkSegment = result.find(s => s.type === 'link');
        expect(linkSegment).toEqual({
          type: 'link',
          content: 'https://example.com',
          displayText: 'https://example.com',
          url: 'https://example.com',
          isFilePath: false,
        });
      });

      it('should preserve URL without trailing punctuation', () => {
        const result = parseNotes('Visit https://example.com/page');
        const linkSegment = result.find(s => s.type === 'link');
        expect(linkSegment).toEqual({
          type: 'link',
          content: 'https://example.com/page',
          displayText: 'https://example.com/page',
          url: 'https://example.com/page',
          isFilePath: false,
        });
      });

      it('should handle URL at end of sentence with semicolon', () => {
        const result = parseNotes('First link: https://example.com;');
        const linkSegment = result.find(s => s.type === 'link');
        expect(linkSegment).toEqual({
          type: 'link',
          content: 'https://example.com',
          displayText: 'https://example.com',
          url: 'https://example.com',
          isFilePath: false,
        });
      });

      it('should handle URL followed by closing bracket', () => {
        const result = parseNotes('(see https://example.com)');
        const linkSegment = result.find(s => s.type === 'link');
        expect(linkSegment).toEqual({
          type: 'link',
          content: 'https://example.com',
          displayText: 'https://example.com',
          url: 'https://example.com',
          isFilePath: false,
        });
        // The closing paren should remain as a text segment
        const lastSegment = result[result.length - 1];
        expect(lastSegment).toEqual({ type: 'text', content: ')' });
      });
    });

    describe('file path detection', () => {
      describe('Unix paths', () => {
        it('should detect multi-segment absolute paths', () => {
          const result = parseNotes('Check /home/user/file.txt for details');
          const linkSegment = result.find(s => s.type === 'link');
          expect(linkSegment).toEqual({
            type: 'link',
            content: '/home/user/file.txt',
            displayText: '/home/user/file.txt',
            url: '/home/user/file.txt',
            isFilePath: true,
          });
        });

        it('should detect two-segment paths', () => {
          const result = parseNotes('See /etc/nginx.conf');
          const linkSegment = result.find(s => s.type === 'link');
          expect(linkSegment).toEqual({
            type: 'link',
            content: '/etc/nginx.conf',
            displayText: '/etc/nginx.conf',
            url: '/etc/nginx.conf',
            isFilePath: true,
          });
        });

        it('should NOT detect single-segment paths', () => {
          const result = parseNotes('Navigate to /transaction page');
          const linkSegments = result.filter(s => s.type === 'link');
          expect(linkSegments).toHaveLength(0);
        });

        it('should handle paths with trailing slashes', () => {
          const result = parseNotes('Look in /usr/bin/ directory');
          const linkSegment = result.find(s => s.type === 'link');
          expect(linkSegment).toEqual({
            type: 'link',
            content: '/usr/bin/',
            displayText: '/usr/bin/',
            url: '/usr/bin/',
            isFilePath: true,
          });
        });

        it('should detect deep nested paths', () => {
          const result = parseNotes('File at /var/log/nginx/access.log');
          const linkSegment = result.find(s => s.type === 'link');
          expect(linkSegment).toEqual({
            type: 'link',
            content: '/var/log/nginx/access.log',
            displayText: '/var/log/nginx/access.log',
            url: '/var/log/nginx/access.log',
            isFilePath: true,
          });
        });

        it('should NOT match paths with spaces', () => {
          const result = parseNotes('Not a path: /this has spaces/file');
          const linkSegments = result.filter(s => s.type === 'link');
          expect(linkSegments).toHaveLength(0);
        });

        it('should detect single-segment paths with trailing slash', () => {
          const result = parseNotes('Navigate to /transaction/ page');
          const linkSegment = result.find(s => s.type === 'link');
          expect(linkSegment).toEqual({
            type: 'link',
            content: '/transaction/',
            displayText: '/transaction/',
            url: '/transaction/',
            isFilePath: true,
          });
        });

        it('should detect paths with dashes and underscores', () => {
          const result = parseNotes('See /opt/my-app/config_file.yml');
          const linkSegment = result.find(s => s.type === 'link');
          expect(linkSegment).toEqual({
            type: 'link',
            content: '/opt/my-app/config_file.yml',
            displayText: '/opt/my-app/config_file.yml',
            url: '/opt/my-app/config_file.yml',
            isFilePath: true,
          });
        });
      });
    });
  });
});
