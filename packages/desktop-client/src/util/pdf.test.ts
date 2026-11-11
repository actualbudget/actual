import { createPdfFromImagePages, fitImageOnPage } from './pdf';

const decoder = new TextDecoder('latin1');

describe('fitImageOnPage', () => {
  it('fits the image inside the margins keeping its aspect ratio', () => {
    const placement = fitImageOnPage(
      { width: 2000, height: 1000 },
      { pageWidth: 600, pageHeight: 800, margin: 50 },
    );
    expect(placement).toEqual({
      x: 50,
      y: 800 - 50 - 250,
      width: 500,
      height: 250,
    });
  });

  it('limits by height when the image is tall', () => {
    const placement = fitImageOnPage(
      { width: 100, height: 1000 },
      { pageWidth: 600, pageHeight: 800, margin: 50 },
    );
    expect(placement.height).toBe(700);
    expect(placement.width).toBe(70);
    expect(placement.y).toBe(50);
  });
});

describe('createPdfFromImagePages', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);

  it('writes a well-formed document with one page per image', () => {
    const pdf = createPdfFromImagePages(
      [
        { jpeg, width: 10, height: 20 },
        { jpeg, width: 10, height: 20 },
      ],
      {
        title: 'Main dashboard',
        creationDate: new Date('2026-10-19T10:00:00Z'),
      },
    );
    const text = decoder.decode(pdf);

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Type /Pages /Count 2');
    expect(text.match(/\/Type \/Page /g)).toHaveLength(2);
    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(2);
    expect(text).toContain('/Filter /DCTDecode');
    expect(text).toContain('/Width 10 /Height 20');
    expect(text).toContain('/CreationDate (D:20261019100000Z)');
    // Title is stored as UTF-16BE hex so any language works.
    expect(text).toContain(
      '/Title <FEFF004D00610069006E002000640061007300680062006F006100720064>',
    );
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);

    // The cross reference table points at the real object offsets.
    const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const entries = text
      .slice(startxref)
      .split('\n')
      .filter(line => / 00000 n $/.test(line))
      .map(line => Number(line.slice(0, 10)));
    expect(entries).toHaveLength(3 + 2 * 3);
    entries.forEach((offset, index) => {
      expect(text.slice(offset, offset + `${index + 1} 0 obj`.length)).toBe(
        `${index + 1} 0 obj`,
      );
    });
  });

  it('embeds the image bytes verbatim', () => {
    const pdf = createPdfFromImagePages([{ jpeg, width: 1, height: 1 }]);
    const text = decoder.decode(pdf);
    const streamStart = text.indexOf('/Filter /DCTDecode');
    const dataStart = text.indexOf('stream\n', streamStart) + 'stream\n'.length;
    expect(Array.from(pdf.slice(dataStart, dataStart + jpeg.length))).toEqual(
      Array.from(jpeg),
    );
  });

  it('refuses to create an empty document', () => {
    expect(() => createPdfFromImagePages([])).toThrow();
  });
});
