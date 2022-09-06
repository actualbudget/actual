import fs from '../../platform/server/fs';

const uuid = require('../../platform/uuid');

export async function uniqueFileName(existingFiles) {
  let initialName = 'My Finances';
  let idx = 1;

  // If there is a conflict, keep appending an index until there is no
  // conflict and we have a unique name
  let newName = initialName;
  while (existingFiles.find(file => file.name === newName)) {
    newName = `${initialName} ${idx}`;
    idx++;
  }

  return newName;
}

export async function idFromFileName(name) {
  let id =
    name.replace(/( |[^A-Za-z0-9])/g, '-') + '-' + uuid.v4Sync().slice(0, 7);

  // Make sure the id is unique. There's a chance one could already
  // exist (although very unlikely now that we append unique
  // characters onto the id)
  let index = 0;

  let budgetDir = fs.getBudgetDir(id);
  while (await fs.exists(budgetDir)) {
    index++;
    budgetDir = fs.getBudgetDir(id + index.toString());
  }

  // If a suffix was added, update the id
  if (index > 0) {
    id = id + index.toString();
  }

  return id;
}
