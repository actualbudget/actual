import constants from '../constants';

export function debugCell(sheet, name) {
  return {
    type: constants.DEBUG_CELL,
    sheet,
    name
  };
}
