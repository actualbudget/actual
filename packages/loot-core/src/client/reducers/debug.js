import * as constants from '../constants';

const initialState = {
  selectedCell: null,
};

function update(state = initialState, action) {
  switch (action.type) {
    case constants.DEBUG_CELL:
      return {
        ...state,
        selectedCell: action.sheet
          ? { sheet: action.sheet, name: action.name }
          : null,
      };
    default:
  }
  return state;
}

export default update;
