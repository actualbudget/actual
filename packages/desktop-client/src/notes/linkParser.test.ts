import { parseNotes, removeTagFromNotes } from './linkParser';
import type { TagSegment } from './linkParser';

function getTags(notes: string): TagSegment[] {
  return parseNotes(notes).filter(segment => segment.type === 'tag');
}

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
  describe('tag offsets', () => {
    it.each([
      ['#tag', ['#tag']],
      ['buy milk #food today', ['#food']],
      ['#a #b  #c', ['#a', '#b', '#c']],
      ['#a#b', ['#a', '#b']],
      ['word#tag', ['#tag']],
      ['#dup and #dup', ['#dup', '#dup']],
      ['see https://example.com/x #after', ['#after']],
      ['#before [docs](https://example.com) #after', ['#before', '#after']],
      ['www.example.com, #after', ['#after']],
      ['##escaped #real', ['#real']],
      ['/usr/bin/x #path', ['#path']],
    ])('should point at each tag in %j', (notes, expected) => {
      const tags = getTags(notes);
      expect(tags.map(tag => tag.content)).toEqual(expected);
      for (const tag of tags) {
        expect(notes.slice(tag.start, tag.end)).toBe(tag.content);
      }
    });

    it('should report distinct offsets for duplicate tags', () => {
      const [first, second] = getTags('#dup and #dup');
      expect([first.start, first.end]).toEqual([0, 4]);
      expect([second.start, second.end]).toEqual([9, 13]);
    });
  });

  describe('removeTagFromNotes', () => {
    function removeNthTag(notes: string, n: number) {
      return removeTagFromNotes(notes, getTags(notes)[n]);
    }

    it('should remove a tag in the middle without leaving a double space', () => {
      expect(removeNthTag('buy milk #food today', 0)).toBe('buy milk today');
    });

    it('should remove a tag at the start', () => {
      expect(removeNthTag('#food buy milk', 0)).toBe('buy milk');
    });

    it('should remove a tag at the end', () => {
      expect(removeNthTag('buy milk #food', 0)).toBe('buy milk');
    });

    it('should leave empty notes when removing the only tag', () => {
      expect(removeNthTag('#food', 0)).toBe('');
      expect(removeNthTag('  #food ', 0)).toBe('');
    });

    it('should keep line breaks around the removed tag', () => {
      expect(removeNthTag('line one #food\nline two', 0)).toBe(
        'line one\nline two',
      );
      expect(removeNthTag('line one\n#food line two', 0)).toBe(
        'line one\nline two',
      );
    });

    it('should remove only the clicked tag of adjacent tags', () => {
      expect(removeNthTag('#a#b', 0)).toBe('#b');
      expect(removeNthTag('#a#b', 1)).toBe('#a');
      expect(removeNthTag('x #a#b#c y', 1)).toBe('x #a#c y');
    });

    it('should keep text that the tag was attached to', () => {
      expect(removeNthTag('word#tag more', 0)).toBe('word more');
    });

    it('should remove only the clicked occurrence of a duplicate tag', () => {
      expect(removeNthTag('#dup and #dup again', 0)).toBe('and #dup again');
      expect(removeNthTag('#dup and #dup again', 1)).toBe('#dup and again');
    });

    it('should leave neighbouring links intact', () => {
      expect(removeNthTag('see https://example.com/x #tag', 0)).toBe(
        'see https://example.com/x',
      );
      expect(removeNthTag('#tag https://example.com/x', 0)).toBe(
        'https://example.com/x',
      );
      expect(removeNthTag('a [docs](https://example.com) #tag b', 0)).toBe(
        'a [docs](https://example.com) b',
      );
      expect(removeNthTag('#one [docs](https://example.com) #two', 1)).toBe(
        '#one [docs](https://example.com)',
      );
    });

    it('should preserve escaped hashes', () => {
      expect(removeNthTag('##escaped #real', 0)).toBe('##escaped');
      expect(removeNthTag('#real ##escaped', 0)).toBe('##escaped');
    });

    it('should leave notes untouched for a segment from other notes', () => {
      const [stale] = getTags('some #tag');
      expect(removeTagFromNotes('different text', stale)).toBe(
        'different text',
      );
    });
  });
});
