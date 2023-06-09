import join from './path-join';

let documentDir;
export const _setDocumentDir = dir => (documentDir = dir);

export const getDocumentDir = () => {
  if (!documentDir) {
    throw new Error('Document directory is not set');
  }
  return documentDir;
};

export const getBudgetDir = id => {
  if (!id) {
    throw new Error('getDocumentDir: id is falsy: ' + id);
  }

  // TODO: This should be better
  //
  // A cheesy safe guard. The id is generated from the budget name,
  // so it provides an entry point for the user to accidentally (or
  // intentionally) access other parts of the system. Always
  // restrict it to only access files within the budget directory by
  // never allowing slashes.
  if (id.match(/[^A-Za-z0-9\-_]/)) {
    throw new Error(
      `Invalid budget id “${id}”. Check the id of your budget in the Advanced section of the settings page.`,
    );
  }

  return join(getDocumentDir(), id);
};
