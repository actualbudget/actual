import { snapdom } from '@zumer/snapdom';

import { createPdfFromImagePages, PDF_PAGE_SIZES } from '#util/pdf';

export type DashboardExportFormat = 'json' | 'png' | 'pdf';

/** Position and size of a widget, in CSS pixels relative to the grid. */
export type ExportWidgetRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** A widget placed on an export page, in page units. */
export type PlacedWidget = ExportWidgetRect;

export type ExportPage = {
  widgets: PlacedWidget[];
};

type PaginateOptions = {
  /** Width of the dashboard grid in CSS pixels. */
  gridWidth: number;
  /** Printable page size, in page units. */
  pageWidth: number;
  pageHeight: number;
  /** Space reserved at the top of the first page for the title block. */
  headerHeight: number;
};

/**
 * Lays dashboard widgets out on pages, preserving the dashboard layout.
 *
 * The grid is scaled to the page width. Widgets are visited in reading order
 * (top to bottom, left to right); as soon as one no longer fits on the
 * current page, it and every widget after it move on to the next page, with
 * their positions kept relative to the first widget on that page. A widget is
 * never split across two pages; one that is taller than a whole page is
 * shrunk to fit.
 */
export function paginateWidgets(
  widgets: ExportWidgetRect[],
  { gridWidth, pageWidth, pageHeight, headerHeight }: PaginateOptions,
): ExportPage[] {
  if (widgets.length === 0 || gridWidth <= 0) {
    return [];
  }

  const scale = pageWidth / gridWidth;
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);

  const pages: ExportPage[] = [];
  let current: { startY: number; top: number; widgets: PlacedWidget[] } | null =
    null;

  for (const widget of sorted) {
    if (!current) {
      current = { startY: widget.y, top: headerHeight, widgets: [] };
    }

    let top = current.top + (widget.y - current.startY) * scale;
    let height = widget.height * scale;

    if (top + height > pageHeight && current.widgets.length > 0) {
      pages.push({ widgets: current.widgets });
      current = { startY: widget.y, top: 0, widgets: [] };
      top = 0;
    }

    let width = widget.width * scale;
    if (top + height > pageHeight) {
      // Taller than the page on its own: shrink it (keeping the aspect ratio)
      // rather than cutting it off.
      const shrink = Math.max(pageHeight - top, 1) / height;
      height *= shrink;
      width *= shrink;
    }

    current.widgets.push({
      id: widget.id,
      x: widget.x * scale,
      y: top,
      width,
      height,
    });
  }

  if (current && current.widgets.length > 0) {
    pages.push({ widgets: current.widgets });
  }

  return pages;
}

/**
 * Resolves a CSS color expression (typically a theme `var(--color-…)`
 * reference) to the concrete color currently in effect, so it can be used
 * with the canvas API which does not understand CSS variables.
 */
export function resolveCssColor(cssColor: string): string {
  const probe = document.createElement('span');
  probe.style.color = cssColor;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  try {
    return getComputedStyle(probe).color || cssColor;
  } finally {
    probe.remove();
  }
}

export type DashboardExportHeader = {
  title: string;
  subtitle: string;
};

export type DashboardExportTheme = {
  backgroundColor: string;
  textColor: string;
  subduedTextColor: string;
  fontFamily: string;
};

type CapturedWidget = ExportWidgetRect & { canvas: HTMLCanvasElement };

/** Device pixels per CSS pixel in the rendered images. */
const CAPTURE_PIXEL_RATIO = 2;

/**
 * Measures the widgets relative to the grid and renders each one to its own
 * canvas. Rendering per widget (instead of the whole grid at once) is what
 * lets the PDF export move widgets between pages.
 */
async function captureWidgets(
  gridElement: HTMLElement,
  widgetElements: Array<{ id: string; element: HTMLElement }>,
  theme: DashboardExportTheme,
): Promise<{
  gridWidth: number;
  gridHeight: number;
  widgets: CapturedWidget[];
}> {
  const gridRect = gridElement.getBoundingClientRect();

  const widgets: CapturedWidget[] = [];
  for (const { id, element } of widgetElements) {
    const rect = element.getBoundingClientRect();
    const canvas = await snapdom.toCanvas(element, {
      scale: CAPTURE_PIXEL_RATIO,
      backgroundColor: theme.backgroundColor,
      embedFonts: true,
      // Overlays and controls that only make sense on screen.
      exclude: '[data-export-ignore]',
    });
    widgets.push({
      id,
      x: rect.left - gridRect.left,
      y: rect.top - gridRect.top,
      width: rect.width,
      height: rect.height,
      canvas,
    });
  }

  return { gridWidth: gridRect.width, gridHeight: gridRect.height, widgets };
}

function drawHeader(
  context: CanvasRenderingContext2D,
  header: DashboardExportHeader,
  theme: DashboardExportTheme,
  { x, y, titleSize }: { x: number; y: number; titleSize: number },
): number {
  const subtitleSize = Math.round(titleSize * 0.55);
  context.textBaseline = 'top';
  context.fillStyle = theme.textColor;
  context.font = `700 ${titleSize}px ${theme.fontFamily}`;
  context.fillText(header.title, x, y);
  context.fillStyle = theme.subduedTextColor;
  context.font = `400 ${subtitleSize}px ${theme.fontFamily}`;
  context.fillText(header.subtitle, x, y + titleSize * 1.35);
  return titleSize * 1.35 + subtitleSize * 1.4;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob ? resolve(blob) : reject(new Error('Failed to encode image')),
      type,
      quality,
    );
  });
}

type RenderOptions = {
  gridElement: HTMLElement;
  widgetElements: Array<{ id: string; element: HTMLElement }>;
  header: DashboardExportHeader;
  theme: DashboardExportTheme;
};

/**
 * Renders the whole dashboard (title, date and widgets as laid out) into a
 * single PNG image.
 */
export async function renderDashboardToPng({
  gridElement,
  widgetElements,
  header,
  theme,
}: RenderOptions): Promise<Uint8Array> {
  const { gridWidth, gridHeight, widgets } = await captureWidgets(
    gridElement,
    widgetElements,
    theme,
  );

  const padding = 24;
  const titleSize = 26;
  const headerHeight = titleSize * 1.35 + titleSize * 0.55 * 1.4 + padding;
  const width = gridWidth + padding * 2;
  const height = headerHeight + gridHeight + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * CAPTURE_PIXEL_RATIO);
  canvas.height = Math.ceil(height * CAPTURE_PIXEL_RATIO);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not supported');
  }
  context.scale(CAPTURE_PIXEL_RATIO, CAPTURE_PIXEL_RATIO);
  context.fillStyle = theme.backgroundColor;
  context.fillRect(0, 0, width, height);

  drawHeader(context, header, theme, { x: padding, y: padding, titleSize });

  for (const widget of widgets) {
    context.drawImage(
      widget.canvas,
      padding + widget.x,
      padding + headerHeight + widget.y,
      widget.width,
      widget.height,
    );
  }

  const blob = await canvasToBlob(canvas, 'image/png');
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Renders the dashboard into a printable, multi-page PDF. See
 * `paginateWidgets` for how widgets are distributed over pages.
 */
export async function renderDashboardToPdf({
  gridElement,
  widgetElements,
  header,
  theme,
}: RenderOptions): Promise<Uint8Array> {
  const { gridWidth, widgets } = await captureWidgets(
    gridElement,
    widgetElements,
    theme,
  );
  const canvasById = new Map(widgets.map(widget => [widget.id, widget.canvas]));

  const { width: pageWidth, height: pageHeight } = PDF_PAGE_SIZES.a4;
  const margin = 36;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;

  const titleSize = 18;
  const headerHeight = titleSize * 1.35 + titleSize * 0.55 * 1.4 + 14;

  const pages = paginateWidgets(widgets, {
    gridWidth,
    pageWidth: printableWidth,
    pageHeight: printableHeight,
    headerHeight,
  });

  // Points are rendered at a resolution that keeps text crisp when printed.
  const pixelsPerPoint = 2.5;
  const jpegPages = [];
  for (const [index, page] of pages.entries()) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(printableWidth * pixelsPerPoint);
    canvas.height = Math.ceil(printableHeight * pixelsPerPoint);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not supported');
    }
    context.scale(pixelsPerPoint, pixelsPerPoint);
    context.fillStyle = theme.backgroundColor;
    context.fillRect(0, 0, printableWidth, printableHeight);

    if (index === 0) {
      drawHeader(context, header, theme, { x: 0, y: 0, titleSize });
    }

    for (const widget of page.widgets) {
      const widgetCanvas = canvasById.get(widget.id);
      if (widgetCanvas) {
        context.drawImage(
          widgetCanvas,
          widget.x,
          widget.y,
          widget.width,
          widget.height,
        );
      }
    }

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
    jpegPages.push({
      jpeg: new Uint8Array(await blob.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
    });
  }

  return createPdfFromImagePages(jpegPages, {
    pageWidth,
    pageHeight,
    margin,
    title: header.title,
  });
}
