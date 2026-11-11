import { paginateWidgets } from './dashboardExport';
import type { ExportWidgetRect } from './dashboardExport';

const options = {
  gridWidth: 1200,
  pageWidth: 600, // scale 0.5
  pageHeight: 400,
  headerHeight: 50,
};

function widget(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): ExportWidgetRect {
  return { id, x, y, width, height };
}

describe('paginateWidgets', () => {
  it('returns no pages for an empty dashboard', () => {
    expect(paginateWidgets([], options)).toEqual([]);
  });

  it('scales the grid to the page width and keeps the layout', () => {
    const pages = paginateWidgets(
      [widget('a', 0, 0, 600, 200), widget('b', 600, 0, 600, 200)],
      options,
    );

    expect(pages).toHaveLength(1);
    expect(pages[0].widgets).toEqual([
      { id: 'a', x: 0, y: 50, width: 300, height: 100 },
      { id: 'b', x: 300, y: 50, width: 300, height: 100 },
    ]);
  });

  it('moves a widget that does not fit to the next page without splitting it', () => {
    const pages = paginateWidgets(
      [
        widget('a', 0, 0, 1200, 400), // 200 tall on the page: 50..250
        widget('b', 0, 400, 1200, 200), // 100 tall: 250..350 fits
        widget('c', 0, 600, 1200, 200), // 350..450 does not fit
        widget('d', 0, 800, 1200, 200),
      ],
      options,
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].widgets.map(w => w.id)).toEqual(['a', 'b']);
    expect(pages[1].widgets.map(w => w.id)).toEqual(['c', 'd']);
    // The first widget on a new page starts at the top, the rest keep their
    // relative position.
    expect(pages[1].widgets[0]).toMatchObject({ y: 0, height: 100 });
    expect(pages[1].widgets[1]).toMatchObject({ y: 100, height: 100 });
  });

  it('once a widget moves to a new page, all following widgets follow', () => {
    const pages = paginateWidgets(
      [
        widget('a', 0, 0, 1200, 700), // 350 tall: fills page 1
        widget('b', 0, 700, 600, 200), // 350..450: breaks to page 2
        widget('c', 600, 700, 600, 100), // same row as b, would fit on page 1
      ],
      { ...options, headerHeight: 0 },
    );

    expect(pages[0].widgets.map(w => w.id)).toEqual(['a']);
    expect(pages[1].widgets.map(w => w.id)).toEqual(['b', 'c']);
    // Positions on the new page are relative to the first widget on it.
    expect(pages[1].widgets[0]).toMatchObject({ x: 0, y: 0 });
    expect(pages[1].widgets[1]).toMatchObject({ x: 300, y: 0 });
  });

  it('visits widgets in reading order regardless of input order', () => {
    const pages = paginateWidgets(
      [
        widget('bottom', 0, 600, 1200, 200),
        widget('top-right', 600, 0, 600, 600),
        widget('top-left', 0, 0, 600, 600),
      ],
      options,
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].widgets.map(w => w.id)).toEqual(['top-left', 'top-right']);
    expect(pages[1].widgets.map(w => w.id)).toEqual(['bottom']);
  });

  it('shrinks a single widget that is taller than a page', () => {
    const pages = paginateWidgets([widget('huge', 0, 0, 1200, 2000)], {
      ...options,
      headerHeight: 0,
    });

    expect(pages).toHaveLength(1);
    const [placed] = pages[0].widgets;
    expect(placed.height).toBe(400);
    // Aspect ratio is preserved.
    expect(placed.width).toBeCloseTo(600 * (400 / 1000));
  });

  it('reserves the header space on the first page only', () => {
    const pages = paginateWidgets(
      [widget('a', 0, 0, 1200, 720), widget('b', 0, 720, 1200, 720)],
      options,
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].widgets[0].y).toBe(50);
    expect(pages[1].widgets[0].y).toBe(0);
  });
});
