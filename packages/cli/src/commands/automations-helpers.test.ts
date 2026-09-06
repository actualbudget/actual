import {
  appendTemplateLines,
  normalizeTemplate,
  normalizeTemplates,
  stripTemplateLines,
} from './automations';

vi.mock('@actual-app/api', () => ({}));
vi.mock('#connection', () => ({ withConnection: vi.fn() }));

describe('normalizeTemplate', () => {
  it('fills directive and default priority for regular templates', () => {
    expect(normalizeTemplate({ type: 'simple', monthly: 5000 }, 0)).toEqual({
      type: 'simple',
      monthly: 5000,
      directive: 'template',
      priority: 0,
    });
  });

  it('keeps an explicit priority', () => {
    expect(
      normalizeTemplate({ type: 'simple', monthly: 1, priority: 2 }, 0)
        .priority,
    ).toBe(2);
  });

  it('nulls priority for remainder and limit templates', () => {
    expect(
      normalizeTemplate({ type: 'remainder', weight: 1, priority: 3 }, 0)
        .priority,
    ).toBeNull();
    expect(
      normalizeTemplate({ type: 'limit', amount: 1 }, 0).priority,
    ).toBeNull();
  });

  it('marks goals with the goal directive and no priority', () => {
    expect(
      normalizeTemplate({ type: 'goal', amount: 100, priority: 1 }, 0),
    ).toEqual({ type: 'goal', amount: 100, directive: 'goal' });
  });

  it('rejects malformed or error templates', () => {
    expect(() => normalizeTemplate('nope', 1)).toThrow('Template #2 must be');
    expect(() => normalizeTemplate({ type: 'error' }, 0)).toThrow(
      'type "error"',
    );
  });

  it('normalizes a single object or an array', () => {
    expect(normalizeTemplates({ type: 'simple' })).toHaveLength(1);
    expect(
      normalizeTemplates([{ type: 'simple' }, { type: 'goal' }]),
    ).toHaveLength(2);
  });
});

describe('stripTemplateLines', () => {
  it('removes only #template and #goal lines', () => {
    const note = 'Keep me\n#template 50\n  #goal 1000\n#other tag\nAlso keep';
    expect(stripTemplateLines(note)).toBe('Keep me\n#other tag\nAlso keep');
  });

  it('collapses runs of blank lines and trims', () => {
    expect(stripTemplateLines('\n\nA\n#template 1\n\n\n\nB\n')).toBe('A\n\nB');
  });

  it('handles empty input', () => {
    expect(stripTemplateLines(null)).toBe('');
    expect(stripTemplateLines(undefined)).toBe('');
  });
});

describe('appendTemplateLines', () => {
  it('replaces existing template lines with the new ones', () => {
    expect(
      appendTemplateLines('Note\n#template 10', [
        '#template 20',
        ' #goal 500 ',
      ]),
    ).toBe('Note\n#template 20\n#goal 500');
  });

  it('rejects lines that are not template directives', () => {
    expect(() => appendTemplateLines('', ['hello'])).toThrow(
      'must start with #template or #goal',
    );
  });
});
