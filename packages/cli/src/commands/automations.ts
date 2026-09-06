import * as api from '@actual-app/api';
import type { Command } from 'commander';

import { getBackend, withConnection } from '#connection';
import { readJsonInput } from '#input';
import { printOutput } from '#output';
import { resolveId } from '#resolve';
import { assertMonth, currentMonth, isRecord } from '#utils';

/**
 * Category automations (the "Automations" modal in the app, a.k.a. goal
 * templates). Each category stores a JSON array of template objects in its
 * goal_def column, either authored in the UI (source: "ui") or parsed from
 * "#template" / "#goal" lines in the category's note (source: "notes").
 *
 * The public @actual-app/api package does not expose these, so this command
 * talks to the loot-core handlers directly through api.internal.send().
 */

type Template = Record<string, unknown> & { type: string };

type CategoryTemplateRow = {
  id: string;
  name: string;
  group: string;
  hidden: boolean;
  source: 'ui' | 'notes';
  templates: Template[];
};

const NO_PRIORITY_TYPES = new Set(['remainder', 'limit']);
const TEMPLATE_LINE = /^\s*#(template|goal)\b/i;

function backend() {
  return getBackend();
}

/** Fill in the bookkeeping fields the app's parser would have produced. */
export function normalizeTemplate(input: unknown, index: number): Template {
  if (!isRecord(input) || typeof input.type !== 'string') {
    throw new Error(
      `Template #${index + 1} must be an object with a "type" field`,
    );
  }
  const type = input.type;
  if (type === 'error') {
    throw new Error(
      `Template #${index + 1} has type "error" and cannot be saved`,
    );
  }
  const template: Template = { ...input, type };
  if (type === 'goal') {
    template.directive = 'goal';
    delete template.priority;
    return template;
  }
  template.directive = 'template';
  if (NO_PRIORITY_TYPES.has(type)) {
    template.priority = null;
  } else if (template.priority === undefined || template.priority === null) {
    template.priority = 0;
  }
  return template;
}

export function normalizeTemplates(input: unknown): Template[] {
  const list = Array.isArray(input) ? input : [input];
  return list.map((item, i) => normalizeTemplate(item, i));
}

/** Remove existing #template / #goal lines (and nothing else) from a note. */
export function stripTemplateLines(note: string | null | undefined): string {
  if (!note) return '';
  return note
    .split('\n')
    .filter(line => !TEMPLATE_LINE.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function appendTemplateLines(note: string, lines: string[]): string {
  const cleaned = lines.map(l => l.trim()).filter(Boolean);
  for (const line of cleaned) {
    if (!TEMPLATE_LINE.test(line)) {
      throw new Error(
        `Line "${line}" must start with #template or #goal. See https://actualbudget.org/docs/experimental/goal-templates/`,
      );
    }
  }
  const base = stripTemplateLines(note);
  return [base, ...cleaned].filter(Boolean).join('\n');
}

async function loadCategoryRows(
  includeHidden: boolean,
): Promise<CategoryTemplateRow[]> {
  const result = await api.aqlQuery(
    api
      .q('categories')
      .select([
        'id',
        'name',
        'hidden',
        'goal_def',
        'template_settings',
        'group.name',
      ]),
  );
  if (!isRecord(result) || !Array.isArray(result.data)) {
    throw new Error('Query result missing data');
  }
  const rows: CategoryTemplateRow[] = [];
  for (const raw of result.data as Array<Record<string, unknown>>) {
    const hidden = Boolean(raw.hidden);
    if (hidden && !includeHidden) continue;
    let templates: Template[] = [];
    if (typeof raw.goal_def === 'string' && raw.goal_def) {
      try {
        templates = JSON.parse(raw.goal_def);
      } catch {
        templates = [];
      }
    }
    const settings = raw.template_settings;
    const source =
      isRecord(settings) && settings.source === 'ui' ? 'ui' : 'notes';
    rows.push({
      id: String(raw.id),
      name: String(raw.name),
      group: String(raw['group.name'] ?? ''),
      hidden,
      source,
      templates,
    });
  }
  return rows;
}

async function renderTemplates(templates: Template[]): Promise<string> {
  if (templates.length === 0) return '';
  return backend().send(
    'budget/render-note-templates',
    templates as never,
  ) as Promise<string>;
}

async function getTemplates(categoryId: string): Promise<Template[]> {
  const result = (await backend().send(
    'budget/get-category-automations',
    categoryId as never,
  )) as Record<string, Template[]>;
  return result[categoryId] ?? [];
}

async function storeTemplates(
  categoryId: string,
  templates: Template[],
  source: 'ui' | 'notes',
) {
  await backend().send('budget/set-category-automations', {
    categoriesWithTemplates: [{ id: categoryId, templates }],
    source,
  } as never);
}

function templateErrors(templates: Template[]): string[] {
  return templates
    .filter(t => t.type === 'error')
    .map(t => `${String(t.line ?? '')}: ${String(t.error ?? 'parse error')}`);
}

const TEMPLATE_HELP = `
Template JSON examples (same shapes the app stores):
  {"type":"simple","monthly":50000}                     budget 500.00 each month
  {"type":"simple","limit":{"amount":20000,"hold":false,"period":"monthly"}}
  {"type":"by","amount":120000,"month":"2026-12"}       save up 1,200.00 by Dec 2026
  {"type":"periodic","amount":5000,"period":{"period":"week","amount":1},"starting":"2026-01-05"}
  {"type":"schedule","name":"Rent"}                     fund the "Rent" schedule
  {"type":"average","numMonths":3}                      3-month average
  {"type":"percentage","percent":10,"previous":false,"category":"all income"}
  {"type":"remainder","weight":1}
  {"type":"goal","amount":100000}                       long-term goal of 1,000.00
Amounts are integer cents. "priority" defaults to 0.

Text form (same syntax as category notes):
  actual automations set-text "Groceries" --line "#template 500" --line "#goal 1000"
`;

export function registerAutomationsCommand(program: Command) {
  const automations = program
    .command('automations')
    .description('Manage category automations (goal templates)')
    .addHelpText('after', TEMPLATE_HELP);

  automations
    .command('list')
    .description('List categories and their automations')
    .option('--include-hidden', 'Include hidden categories', false)
    .option('--all', 'Include categories with no automations', false)
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const rows = await loadCategoryRows(cmdOpts.includeHidden);
          const output = [];
          for (const row of rows) {
            if (!cmdOpts.all && row.templates.length === 0) continue;
            output.push({
              id: row.id,
              category: row.name,
              group: row.group,
              source: row.source,
              count: row.templates.length,
              rules: await renderTemplates(row.templates),
              errors: templateErrors(row.templates).join('\n'),
            });
          }
          printOutput(output, opts.format);
        },
        { mutates: false },
      );
    });

  automations
    .command('get <category>')
    .description('Show the automations for one category (ID or name)')
    .action(async (category: string) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const id = await resolveId('categories', category);
          const templates = await getTemplates(id);
          printOutput(
            {
              id,
              rules: await renderTemplates(templates),
              templates,
            },
            opts.format,
          );
        },
        { mutates: false },
      );
    });

  automations
    .command('set <category>')
    .description(
      'Replace the automations for a category with a JSON array of templates',
    )
    .option('--data <json>', 'Template array as JSON')
    .option(
      '--file <path>',
      'Read template array from JSON file (use - for stdin)',
    )
    .option('--dry-run', 'Validate and preview without saving', false)
    .action(async (category: string, cmdOpts) => {
      const opts = program.opts();
      const templates = normalizeTemplates(readJsonInput(cmdOpts));
      await withConnection(
        opts,
        async () => {
          const id = await resolveId('categories', category);
          const rendered = await renderTemplates(templates);
          if (!cmdOpts.dryRun) {
            await storeTemplates(id, templates, 'ui');
          }
          printOutput(
            {
              success: !cmdOpts.dryRun,
              dryRun: Boolean(cmdOpts.dryRun),
              id,
              rules: rendered,
              templates,
            },
            opts.format,
          );
        },
        { mutates: !cmdOpts.dryRun },
      );
    });

  automations
    .command('add <category>')
    .description('Append one or more templates (JSON) to a category')
    .option('--data <json>', 'Template object or array as JSON')
    .option('--file <path>', 'Read templates from JSON file (use - for stdin)')
    .action(async (category: string, cmdOpts) => {
      const opts = program.opts();
      const additions = normalizeTemplates(readJsonInput(cmdOpts));
      await withConnection(
        opts,
        async () => {
          const id = await resolveId('categories', category);
          const existing = (await getTemplates(id)).filter(
            t => t.type !== 'error',
          );
          const templates = [...existing, ...additions];
          await storeTemplates(id, templates, 'ui');
          printOutput(
            {
              success: true,
              id,
              rules: await renderTemplates(templates),
              templates,
            },
            opts.format,
          );
        },
        { mutates: true },
      );
    });

  automations
    .command('set-text <category>')
    .description(
      'Replace automations using #template/#goal note lines (stored in the category note)',
    )
    .option(
      '--line <text>',
      'A "#template ..." or "#goal ..." line (repeatable)',
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    )
    .option('--file <path>', 'Read lines from a text file (use - for stdin)')
    .action(async (category: string, cmdOpts) => {
      const opts = program.opts();
      let lines: string[] = cmdOpts.line;
      if (cmdOpts.file) {
        const { readFileSync } = await import('fs');
        const text =
          cmdOpts.file === '-'
            ? readFileSync(0, 'utf-8')
            : readFileSync(cmdOpts.file, 'utf-8');
        lines = [...lines, ...text.split('\n')];
      }
      lines = lines.map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        throw new Error('Provide at least one --line or a --file');
      }
      await withConnection(
        opts,
        async () => {
          const id = await resolveId('categories', category);
          const currentNote = (await api.getNote(id)) as
            | string
            | null
            | undefined;
          const note = appendTemplateLines(
            typeof currentNote === 'string' ? currentNote : '',
            lines,
          );
          // Switch the category back to note-driven templates, write the
          // note, then let loot-core parse it into goal_def.
          await storeTemplates(id, [], 'notes');
          await api.updateNote(id, note);
          await backend().send('budget/store-note-templates', [id] as never);
          const templates = await getTemplates(id);
          const errors = templateErrors(templates);
          printOutput(
            {
              success: errors.length === 0,
              id,
              note,
              rules: await renderTemplates(templates),
              errors,
              templates,
            },
            opts.format,
          );
          if (errors.length > 0) {
            process.exitCode = 1;
          }
        },
        { mutates: true },
      );
    });

  automations
    .command('clear <category>')
    .description('Remove all automations (and #template/#goal note lines)')
    .action(async (category: string) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const id = await resolveId('categories', category);
          const currentNote = (await api.getNote(id)) as
            | string
            | null
            | undefined;
          if (
            typeof currentNote === 'string' &&
            currentNote.split('\n').some(l => TEMPLATE_LINE.test(l))
          ) {
            await api.updateNote(id, stripTemplateLines(currentNote));
          }
          await storeTemplates(id, [], 'notes');
          printOutput({ success: true, id }, opts.format);
        },
        { mutates: true },
      );
    });

  automations
    .command('dry-run <category>')
    .description('Show what the automations would budget for a month')
    .option('--month <month>', 'Budget month (YYYY-MM, default: current)')
    .action(async (category: string, cmdOpts) => {
      const opts = program.opts();
      const month = assertMonth(cmdOpts.month ?? currentMonth());
      await withConnection(
        opts,
        async () => {
          const id = await resolveId('categories', category);
          const templates = await getTemplates(id);
          const result = (await backend().send(
            'budget/dry-run-category-template',
            { month, categoryId: id, templates } as never,
          )) as { budgeted: number; perTemplate: number[] };
          const rules = (await renderTemplates(templates)).split('\n');
          printOutput(
            {
              month,
              id,
              budgeted: result.budgeted,
              perTemplate: templates.map((t, i) => ({
                rule: rules[i] ?? t.type,
                amount: result.perTemplate[i] ?? 0,
              })),
            },
            opts.format,
          );
        },
        { mutates: false },
      );
    });

  automations
    .command('apply')
    .description('Apply automations to a month (like "Apply budget template")')
    .option('--month <month>', 'Budget month (YYYY-MM, default: current)')
    .option(
      '--overwrite',
      'Overwrite existing budgeted amounts instead of only filling empty ones',
      false,
    )
    .option(
      '--category <idOrName>',
      'Only apply to this category (repeatable, always overwrites)',
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    )
    .action(async cmdOpts => {
      const opts = program.opts();
      const month = assertMonth(cmdOpts.month ?? currentMonth());
      await withConnection(
        opts,
        async () => {
          let result: unknown;
          if (cmdOpts.category.length > 0) {
            const categoryIds: string[] = [];
            for (const ref of cmdOpts.category as string[]) {
              categoryIds.push(await resolveId('categories', ref));
            }
            result = await backend().send('budget/apply-multiple-templates', {
              month,
              categoryIds,
            } as never);
          } else if (cmdOpts.overwrite) {
            result = await backend().send('budget/overwrite-goal-template', {
              month,
            } as never);
          } else {
            result = await backend().send('budget/apply-goal-template', {
              month,
            } as never);
          }
          printOutput(
            { month, ...(isRecord(result) ? result : {}) },
            opts.format,
          );
        },
        { mutates: true },
      );
    });

  automations
    .command('check')
    .description('Validate all note-based templates and report errors')
    .action(async () => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await backend().send('budget/check-templates');
          printOutput(result, opts.format);
          if (isRecord(result) && result.message === 'template-errors') {
            process.exitCode = 1;
          }
        },
        { mutates: false },
      );
    });

  automations
    .command('cleanup')
    .description('Run end-of-month cleanup templates (#cleanup) for a month')
    .option('--month <month>', 'Budget month (YYYY-MM, default: current)')
    .action(async cmdOpts => {
      const opts = program.opts();
      const month = assertMonth(cmdOpts.month ?? currentMonth());
      await withConnection(
        opts,
        async () => {
          const result = await backend().send('budget/cleanup-goal-template', {
            month,
          } as never);
          printOutput(
            { month, ...(isRecord(result) ? result : {}) },
            opts.format,
          );
        },
        { mutates: true },
      );
    });
}
