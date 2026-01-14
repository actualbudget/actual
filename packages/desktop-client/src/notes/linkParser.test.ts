import { parseNotes } from './linkParser';

describe('linkParser', () => {
  describe('parseNotes', () => {
    describe('people tag parsing', () => {
      it('should parse a single @mention', () => {
        const result = parseNotes('Paid @joesmith for lunch');
        const personSegment = result.find(s => s.type === 'person');
        expect(personSegment).toEqual({
          type: 'person',
          content: '@joesmith',
          person: 'joesmith',
        });
      });

      it('should parse multiple @mentions', () => {
        const result = parseNotes('Dinner with @alice and @bob');
        const personSegments = result.filter(s => s.type === 'person');
        expect(personSegments).toHaveLength(2);
        expect(personSegments[0]).toEqual({
          type: 'person',
          content: '@alice',
          person: 'alice',
        });
        expect(personSegments[1]).toEqual({
          type: 'person',
          content: '@bob',
          person: 'bob',
        });
      });

      it('should parse @mention with punctuation in name', () => {
        const result = parseNotes('Paid @joe-smith for coffee');
        const personSegment = result.find(s => s.type === 'person');
        expect(personSegment).toEqual({
          type: 'person',
          content: '@joe-smith',
          person: 'joe-smith',
        });
      });

      it('should parse @mention with underscore in name', () => {
        const result = parseNotes('Gift for @joe_smith');
        const personSegment = result.find(s => s.type === 'person');
        expect(personSegment).toEqual({
          type: 'person',
          content: '@joe_smith',
          person: 'joe_smith',
        });
      });

      it('should not parse double @@ as a person', () => {
        const result = parseNotes('Email me at user@@domain.com');
        const personSegments = result.filter(s => s.type === 'person');
        expect(personSegments).toHaveLength(0);
      });

      it('should parse both #tags and @mentions in the same note', () => {
        const result = parseNotes('Lunch with @alice #food');
        const personSegment = result.find(s => s.type === 'person');
        const tagSegment = result.find(s => s.type === 'tag');
        expect(personSegment).toEqual({
          type: 'person',
          content: '@alice',
          person: 'alice',
        });
        expect(tagSegment).toEqual({
          type: 'tag',
          content: '#food',
          tag: 'food',
        });
      });

      it('should parse @mention at start of word with trailing text', () => {
        const result = parseNotes('@vendor-payment');
        const personSegment = result.find(s => s.type === 'person');
        expect(personSegment).toEqual({
          type: 'person',
          content: '@vendor-payment',
          person: 'vendor-payment',
        });
      });

      it('should handle standalone @ as text', () => {
        const result = parseNotes('Just a @ symbol');
        const personSegments = result.filter(s => s.type === 'person');
        expect(personSegments).toHaveLength(0);
      });
    });

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
  });
});
