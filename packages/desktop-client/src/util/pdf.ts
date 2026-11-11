/**
 * A tiny PDF writer: just enough of the format to produce a multi-page
 * document where every page shows one JPEG image. This is all a dashboard
 * export needs, and it avoids shipping a full PDF library to the client.
 */

export type PdfImagePage = {
  /** Baseline JPEG data (as produced by `canvas.toBlob('image/jpeg')`). */
  jpeg: Uint8Array;
  /** Pixel dimensions of the JPEG. */
  width: number;
  height: number;
};

export type PdfDocumentOptions = {
  /** Page size in PDF points (1/72 inch). Defaults to A4 portrait. */
  pageWidth?: number;
  pageHeight?: number;
  /** Distance between the page edge and the image, in points. */
  margin?: number;
  title?: string;
  creationDate?: Date;
};

export const PDF_PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
} as const;

const encoder = new TextEncoder();

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

/** Encodes arbitrary text as a PDF hex string (UTF-16BE with BOM). */
function pdfTextString(text: string): string {
  let hex = 'FEFF';
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint > 0xffff) {
      const offset = codePoint - 0x10000;
      const high = 0xd800 + (offset >> 10);
      const low = 0xdc00 + (offset & 0x3ff);
      hex += high.toString(16).padStart(4, '0');
      hex += low.toString(16).padStart(4, '0');
    } else {
      hex += codePoint.toString(16).padStart(4, '0');
    }
  }
  return `<${hex.toUpperCase()}>`;
}

function pdfDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `(D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z)`
  );
}

/**
 * Computes where an image goes on the page so that it fits inside the
 * margins while keeping its aspect ratio, anchored at the top-left.
 */
export function fitImageOnPage(
  image: { width: number; height: number },
  page: { pageWidth: number; pageHeight: number; margin: number },
): { x: number; y: number; width: number; height: number } {
  const maxWidth = page.pageWidth - page.margin * 2;
  const maxHeight = page.pageHeight - page.margin * 2;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    x: page.margin,
    // PDF coordinates start at the bottom-left corner of the page.
    y: page.pageHeight - page.margin - height,
    width,
    height,
  };
}

/**
 * Builds a PDF document with one page per image.
 */
export function createPdfFromImagePages(
  pages: PdfImagePage[],
  {
    pageWidth = PDF_PAGE_SIZES.a4.width,
    pageHeight = PDF_PAGE_SIZES.a4.height,
    margin = 36,
    title,
    creationDate = new Date(),
  }: PdfDocumentOptions = {},
): Uint8Array {
  if (pages.length === 0) {
    throw new Error('A PDF document needs at least one page.');
  }

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const write = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.byteLength;
  };

  // Object numbering: 1 catalog, 2 pages, 3 info, then 3 objects per page
  // (page, content stream, image).
  const pageObjectNumber = (index: number) => 4 + index * 3;
  const contentObjectNumber = (index: number) => 5 + index * 3;
  const imageObjectNumber = (index: number) => 6 + index * 3;
  const objectCount = 3 + pages.length * 3;

  const beginObject = (number: number) => {
    offsets[number] = length;
    write(`${number} 0 obj\n`);
  };
  const endObject = () => write('endobj\n');

  write('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');

  beginObject(1);
  write('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObject();

  beginObject(2);
  write(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages
      .map((_, index) => `${pageObjectNumber(index)} 0 R`)
      .join(' ')}] >>\n`,
  );
  endObject();

  beginObject(3);
  write(
    `<< /Producer ${pdfTextString('Actual Budget')}` +
      (title ? ` /Title ${pdfTextString(title)}` : '') +
      ` /CreationDate ${pdfDate(creationDate)} >>\n`,
  );
  endObject();

  pages.forEach((page, index) => {
    const placement = fitImageOnPage(page, { pageWidth, pageHeight, margin });
    const content =
      `q ${formatNumber(placement.width)} 0 0 ${formatNumber(placement.height)} ` +
      `${formatNumber(placement.x)} ${formatNumber(placement.y)} cm /Im0 Do Q\n`;

    beginObject(pageObjectNumber(index));
    write(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatNumber(pageWidth)} ${formatNumber(pageHeight)}] ` +
        `/Resources << /XObject << /Im0 ${imageObjectNumber(index)} 0 R >> >> ` +
        `/Contents ${contentObjectNumber(index)} 0 R >>\n`,
    );
    endObject();

    beginObject(contentObjectNumber(index));
    write(`<< /Length ${encoder.encode(content).byteLength} >>\nstream\n`);
    write(content);
    write('endstream\n');
    endObject();

    beginObject(imageObjectNumber(index));
    write(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
        `/Length ${page.jpeg.byteLength} >>\nstream\n`,
    );
    write(page.jpeg);
    write('\nendstream\n');
    endObject();
  });

  const xrefOffset = length;
  write(`xref\n0 ${objectCount + 1}\n`);
  write('0000000000 65535 f \n');
  for (let number = 1; number <= objectCount; number++) {
    write(`${String(offsets[number]).padStart(10, '0')} 00000 n \n`);
  }
  write(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info 3 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
  );

  const result = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.byteLength;
  }
  return result;
}
