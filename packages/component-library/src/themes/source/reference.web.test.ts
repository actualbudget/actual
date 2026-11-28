import { colors } from './colors';
import { buildThemeReference } from './reference';

function followsCell(reference: string, name: string) {
  const row = reference
    .split('\n')
    .find(line => line.startsWith(`| \`--color-${name}\` `));
  return row?.split('|').at(-2)?.trim();
}

describe('theme variable reference', () => {
  it('lists every variable once', () => {
    const reference = buildThemeReference();
    for (const name of Object.keys(colors)) {
      const rows = reference.match(
        new RegExp(`^\\| \`--color-${name}\` +\\|`, 'gm'),
      );
      expect(rows, name).toHaveLength(1);
    }
  });

  it('names the variable a color follows', () => {
    expect(followsCell(buildThemeReference(), 'pageBackground')).toBe(
      '`--color-backgroundPage`',
    );
  });

  it('names the themes a color follows another in', () => {
    const reference = buildThemeReference();

    expect(followsCell(reference, 'tableTextLight')).toBe(
      '`--color-tableText` in Dark and Midnight',
    );
    expect(followsCell(reference, 'buttonBareDisabledText')).toBe(
      '`--color-pageTextSubdued` in Light',
    );
  });

  it('describes colors that are worked out from others', () => {
    const reference = buildThemeReference();

    expect(followsCell(reference, 'sidebarItemAccentSelected')).toBe(
      '`--color-accent`, readable on `--color-sidebarBackground`',
    );
    expect(followsCell(reference, 'calendarSelectedText')).toBe(
      'Black or white on `--color-calendarSelectedBackground` over `--color-calendarBackground`',
    );
  });

  it('names the status color a message color is worked out from', () => {
    const reference = buildThemeReference();

    expect(followsCell(reference, 'noticeBackground')).toBe(
      '`--color-success`, as a fill',
    );
    expect(followsCell(reference, 'errorText')).toBe(
      '`--color-error`, readable as text',
    );
  });

  it('names the variables a color is mixed from', () => {
    const reference = buildThemeReference();

    expect(followsCell(reference, 'noteTagBackgroundHover')).toBe(
      'Mixed from `--color-accentSubtle` and `--color-tableBackground`',
    );
    expect(followsCell(reference, 'sidebarItemBackgroundSelected')).toBe(
      'Mixed from `--color-sidebarItemAccentSelected`',
    );
    expect(followsCell(reference, 'buttonBareBackground')).toBe('');
  });
});
