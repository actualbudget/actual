import type {
  ChannelDef,
  ChartConfig,
  ChartSpec,
  Encoding,
  FieldType,
  Mark,
} from 'loot-core/types/chart-spec';

import { toFieldType } from './chart-spec';
import type { QueryResult, QueryResultColumn } from './processQueryResult';

export type ResolvedChannel = ChannelDef & {
  autoAssigned?: boolean;
};

export type ResolvedEncoding = {
  x?: ResolvedChannel | ResolvedChannel[];
  y?: ResolvedChannel | ResolvedChannel[];
  series?: ResolvedChannel;
  color?: ResolvedChannel;
  size?: ResolvedChannel;
  text?: ResolvedChannel;
  tooltip?: ResolvedChannel[];
};

export type ResolvedChartSpec = {
  mark: Mark;
  encoding: ResolvedEncoding;
  config?: ChartConfig;
  warnings: string[];
  errors: string[];
};

type ColumnRoles = {
  timeColumns: string[];
  measureColumns: string[];
  dimensionColumns: string[];
  idColumns: string[];
};

function inferFieldType(
  field: string,
  columns: QueryResultColumn[],
): FieldType {
  const col = columns.find(c => c.name === field);
  if (!col) return 'category';
  return toFieldType(col.type);
}

function columnRoles(result: QueryResult): ColumnRoles {
  const timeColumns: string[] = [];
  const measureColumns: string[] = [];
  const dimensionColumns: string[] = [];
  const idColumns: string[] = [];

  for (const col of result.columns) {
    const ft = toFieldType(col.type);
    if (ft === 'date') {
      timeColumns.push(col.name);
      dimensionColumns.push(col.name);
    } else if (ft === 'number') {
      measureColumns.push(col.name);
    } else {
      dimensionColumns.push(col.name);
    }
    if (col.type === 'id') {
      idColumns.push(col.name);
    }
  }

  return { timeColumns, measureColumns, dimensionColumns, idColumns };
}

function nonIdDimensions(roles: ColumnRoles): string[] {
  return roles.dimensionColumns.filter(name => !roles.idColumns.includes(name));
}

function resolveEmpty(encoding: Encoding): ResolvedEncoding {
  return {
    x: Array.isArray(encoding.x)
      ? encoding.x.map(ch => ({
          ...ch,
          type: ch.type ?? 'category',
          autoAssigned: false,
        }))
      : encoding.x
        ? {
            ...encoding.x,
            type: encoding.x.type ?? 'category',
            autoAssigned: false,
          }
        : undefined,
    y: Array.isArray(encoding.y)
      ? encoding.y.map(ch => ({
          ...ch,
          type: ch.type ?? 'category',
          autoAssigned: false,
        }))
      : encoding.y
        ? {
            ...encoding.y,
            type: encoding.y.type ?? 'category',
            autoAssigned: false,
          }
        : undefined,
    series: encoding.series
      ? {
          ...encoding.series,
          type: encoding.series.type ?? 'category',
          autoAssigned: false,
        }
      : undefined,
    color: encoding.color
      ? {
          ...encoding.color,
          type: encoding.color.type ?? 'category',
          autoAssigned: false,
        }
      : undefined,
    size: encoding.size
      ? {
          ...encoding.size,
          type: encoding.size.type ?? 'category',
          autoAssigned: false,
        }
      : undefined,
    text: encoding.text
      ? {
          ...encoding.text,
          type: encoding.text.type ?? 'category',
          autoAssigned: false,
        }
      : undefined,
    tooltip: encoding.tooltip?.map(ch => ({
      ...ch,
      type: ch.type ?? 'category',
      autoAssigned: false,
    })),
  };
}

export function resolveChannels(
  spec: ChartSpec,
  result: QueryResult,
): ResolvedChartSpec {
  const warnings: string[] = [];
  const errors: string[] = [];
  const encoding = spec.encoding;
  const columns = result.columns;

  if (columns.length === 0) {
    return {
      mark: spec.mark,
      encoding: resolveEmpty(encoding),
      config: spec.config,
      warnings: [...warnings, 'Query returned no columns.'],
      errors: [],
    };
  }

  const yIsArray = Array.isArray(encoding.y);
  const yFieldCount = yIsArray
    ? (encoding.y as ChannelDef[]).length
    : encoding.y
      ? 1
      : 0;
  if (yFieldCount > 1 && encoding.series) {
    errors.push(
      'Multiple Y fields and Series channel are mutually exclusive. ' +
        'Use a single Y channel with Series to create stacks, or use multiple Y channels for grouped series.',
    );
  }

  const xIsArray = Array.isArray(encoding.x);
  const xFieldCount = xIsArray
    ? (encoding.x as ChannelDef[]).length
    : encoding.x
      ? 1
      : 0;
  if (xFieldCount > 1 && encoding.series && spec.mark === 'bar') {
    errors.push(
      'Multiple X fields and Series channel are mutually exclusive on bar marks. ' +
        'Use a single X channel with Series to create stacks, or use multiple X channels for grouped series.',
    );
  }

  if (encoding.size && spec.mark !== 'point') {
    warnings.push(
      `Size channel is only supported on point marks, not on "${spec.mark}". The size channel will be ignored.`,
    );
  }

  if (spec.mark === 'arc') {
    if (!encoding.color && !encoding.series) {
      errors.push(
        'Arc mark requires a Color or Series channel, and a Y channel. ' +
          'Bind a category field to Color/Series and a numeric field to Y.',
      );
    }
    if (!encoding.y) {
      errors.push(
        'Arc mark requires both Color/Series and Y channels. ' +
          'Bind a category field to Color/Series and a numeric field to Y.',
      );
    }
    if (encoding.series) {
      warnings.push(
        'Series channel on arc marks is not yet supported. It will be treated as a Color channel.',
      );
    }
  }

  if (spec.config?.stack && !['column', 'bar', 'area'].includes(spec.mark)) {
    warnings.push(
      `Stack config is only supported on column, bar, and area marks, not on "${spec.mark}". The stack config will be ignored.`,
    );
  }

  const columnNames = new Set(columns.map(c => c.name));
  for (const channelName of ['series', 'color', 'size', 'text'] as const) {
    const ch = encoding[channelName];
    if (ch && !columnNames.has(ch.field)) {
      errors.push(
        `Channel "${channelName}" references field "${ch.field}" which does not exist in the query result. Available fields: ${columns
          .map(c => c.name)
          .join(', ')}.`,
      );
    }
  }
  if (encoding.x) {
    const xChannels = Array.isArray(encoding.x) ? encoding.x : [encoding.x];
    for (const ch of xChannels) {
      if (!columnNames.has(ch.field)) {
        errors.push(
          `Channel "x" references field "${ch.field}" which does not exist in the query result. Available fields: ${columns
            .map(c => c.name)
            .join(', ')}.`,
        );
      }
    }
  }
  if (encoding.y) {
    const yChannels = yIsArray
      ? (encoding.y as ChannelDef[])
      : [encoding.y as ChannelDef];
    for (const ch of yChannels) {
      if (!columnNames.has(ch.field)) {
        errors.push(
          `Channel "y" references field "${ch.field}" which does not exist in the query result. Available fields: ${columns
            .map(c => c.name)
            .join(', ')}.`,
        );
      }
    }
  }

  const roles = columnRoles(result);

  function resolveChannel(
    ch: ChannelDef | undefined,
  ): ResolvedChannel | undefined {
    if (!ch) return undefined;
    const resolvedType: FieldType =
      ch.type ?? inferFieldType(ch.field, columns);
    return {
      field: ch.field,
      type: resolvedType,
      ...(ch.title ? { title: ch.title } : {}),
      ...(ch.format ? { format: ch.format } : {}),
      ...(ch.sort ? { sort: ch.sort } : {}),
      ...(ch.aggregate ? { aggregate: ch.aggregate } : {}),
      autoAssigned: false,
    };
  }

  let resolvedX: ResolvedChannel | ResolvedChannel[] | undefined;
  if (Array.isArray(encoding.x)) {
    resolvedX = encoding.x.map(ch => resolveChannel(ch));
  } else if (encoding.x) {
    resolvedX = resolveChannel(encoding.x as ChannelDef);
  }
  let resolvedY: ResolvedChannel | ResolvedChannel[] | undefined;
  const resolvedColor = resolveChannel(encoding.color);
  let resolvedSize = resolveChannel(encoding.size);
  const resolvedText = resolveChannel(encoding.text);
  let resolvedSeries = resolveChannel(encoding.series);

  if (yIsArray) {
    resolvedY = (encoding.y as ChannelDef[]).map(ch => resolveChannel(ch));
  } else if (encoding.y) {
    const singleY = encoding.y as ChannelDef;
    resolvedY = resolveChannel(singleY);
  }

  switch (spec.mark) {
    case 'table': {
      const xIsEmpty =
        !resolvedX || (Array.isArray(resolvedX) && resolvedX.length === 0);
      const yIsEmpty =
        !resolvedY || (Array.isArray(resolvedY) && resolvedY.length === 0);
      if (xIsEmpty && yIsEmpty) {
        resolvedX = nonIdDimensions(roles).map(field => ({
          field,
          type: inferFieldType(field, columns),
          autoAssigned: true,
        }));
        resolvedY = roles.measureColumns.map(field => ({
          field,
          type: 'number' as const,
          autoAssigned: true,
        }));
      }

      if (resolvedSeries) {
        warnings.push(
          'Series channel is not used on table marks and will be ignored.',
        );
      }
      break;
    }

    case 'number': {
      if (!resolvedY) {
        const candidate = roles.measureColumns[0];
        if (candidate) {
          resolvedY = {
            field: candidate,
            type: 'number',
            autoAssigned: true,
          };
        } else {
          warnings.push(
            'Number mark requires a numeric field, but the query has no numeric columns.',
          );
        }
      }
      if (resolvedX) {
        warnings.push(
          'X channel is not used on number marks and will be ignored.',
        );
      }
      if (resolvedColor) {
        warnings.push(
          'Color channel is not used on number marks and will be ignored.',
        );
      }
      if (resolvedSeries) {
        warnings.push(
          'Series channel is not used on number marks and will be ignored.',
        );
      }
      break;
    }

    case 'column': {
      if (Array.isArray(resolvedX)) {
        if (resolvedX.length > 1) {
          warnings.push(
            'Multiple X fields are not supported on column marks. Only the first field will be used.',
          );
        }
        resolvedX = resolvedX[0];
      } else if (!resolvedX) {
        const candidate = roles.timeColumns[0] ?? nonIdDimensions(roles)[0];
        if (candidate) {
          resolvedX = {
            field: candidate,
            type: inferFieldType(candidate, columns),
            autoAssigned: true,
          };
        }
      }
      if (!resolvedY) {
        if (roles.measureColumns.length === 1) {
          resolvedY = {
            field: roles.measureColumns[0],
            type: 'number',
            autoAssigned: true,
          };
        } else if (roles.measureColumns.length >= 2) {
          resolvedY = roles.measureColumns.map(field => ({
            field,
            type: 'number' as const,
            autoAssigned: true,
          }));
        }
      }
      break;
    }

    case 'bar': {
      // Bar: X = value (horizontal), Y = category (vertical)
      if (!resolvedX) {
        const candidate = roles.measureColumns[0];
        if (candidate) {
          resolvedX = {
            field: candidate,
            type: 'number',
            autoAssigned: true,
          };
        } else {
          warnings.push(
            'Bar mark expects a numeric X field, but the query has no numeric columns.',
          );
        }
      } else if (!Array.isArray(resolvedX) && resolvedX.type !== 'number') {
        warnings.push(
          'Bar mark expects X (horizontal axis) to be a numeric field. Consider using a column mark for categorical X-axis data.',
        );
      }
      if (!resolvedY) {
        const candidate = roles.timeColumns[0] ?? nonIdDimensions(roles)[0];
        if (candidate) {
          resolvedY = {
            field: candidate,
            type: inferFieldType(candidate, columns),
            autoAssigned: true,
          };
        }
      }
      break;
    }

    case 'line':
    case 'area': {
      if (Array.isArray(resolvedX)) {
        if (resolvedX.length > 1) {
          warnings.push(
            'Multiple X fields are not supported on line/area marks. Only the first field will be used.',
          );
        }
        resolvedX = resolvedX[0];
      } else if (!resolvedX) {
        const candidate = roles.timeColumns[0] ?? roles.dimensionColumns[0];
        if (candidate) {
          resolvedX = {
            field: candidate,
            type: inferFieldType(candidate, columns),
            autoAssigned: true,
          };
        }
      }
      if (!resolvedY) {
        if (roles.measureColumns.length === 1) {
          resolvedY = {
            field: roles.measureColumns[0],
            type: 'number',
            autoAssigned: true,
          };
        } else if (roles.measureColumns.length >= 2) {
          resolvedY = roles.measureColumns.map(field => ({
            field,
            type: 'number' as const,
            autoAssigned: true,
          }));
        }
      }
      break;
    }

    case 'point': {
      if (Array.isArray(resolvedX)) {
        if (resolvedX.length > 1) {
          warnings.push(
            'Multiple X fields are not supported on point marks. Only the first field will be used.',
          );
        }
        resolvedX = resolvedX[0];
      } else if (!resolvedX) {
        const candidate = nonIdDimensions(roles)[0];
        if (candidate) {
          resolvedX = {
            field: candidate,
            type: inferFieldType(candidate, columns),
            autoAssigned: true,
          };
        }
      }
      if (!resolvedY) {
        const candidate = roles.measureColumns[0];
        if (candidate) {
          resolvedY = {
            field: candidate,
            type: 'number',
            autoAssigned: true,
          };
        }
      }
      break;
    }

    case 'arc': {
      break;
    }
    default: {
      const _exhaustive: never = spec.mark;
      void _exhaustive;
      break;
    }
  }

  if (resolvedSize && spec.mark !== 'point') {
    resolvedSize = undefined;
  }

  if (
    resolvedSeries &&
    !['column', 'bar', 'line', 'area'].includes(spec.mark)
  ) {
    resolvedSeries = undefined;
  }

  return {
    mark: spec.mark,
    encoding: {
      x: resolvedX,
      y: resolvedY,
      series: resolvedSeries,
      color: resolvedColor,
      size: resolvedSize,
      text: resolvedText,
      tooltip: encoding.tooltip?.map(ch => resolveChannel(ch)),
    },
    config: spec.config,
    warnings,
    errors,
  };
}
