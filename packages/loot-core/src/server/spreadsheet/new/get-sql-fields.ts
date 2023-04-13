function traverse(expr, fields) {
  switch (expr.getTypeName()) {
    case 'FunCall':
      expr.args.children.map(arg => traverse(arg, fields));
      break;

    case 'Member':
      // Right now we only track dependencies on the top-level table,
      // and not any of the joined data. This tracks that field itself
      // that is joined on, but not the joined data yet.
      traverse(expr.object, fields);
      break;

    case 'Literal':
      break;

    case 'Symbol':
      if (fields.indexOf(expr.value) === -1 && expr.value !== 'null') {
        fields.push(expr.value);
      }
      break;

    case 'BinOp':
      traverse(expr.left, fields);
      traverse(expr.right, fields);
      break;
    default:
      throw new Error('Unhandled node type: ' + expr.getTypeName());
  }
}

export default function getSqlFields(table, ast) {
  let fields: string[] = [];
  if (!ast) {
    return fields;
  }

  traverse(ast, fields);

  // These are implicit fields added by the sql generator. Going to
  // revisit how to track all of this.
  if (table === 'transactions') {
    fields.push('isParent');
    fields.push('tombstone');
  }

  return fields;
}
