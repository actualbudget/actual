import * as constants from '../constants';

const initialState = {
  stage: null,
  fromYNAB: false,
};

export default function update(state = initialState, action) {
  switch (action.type) {
    case constants.SET_TUTORIAL_STAGE:
      return {
        ...state,
        deactivated: false,
        stage: action.stage,
        fromYNAB: 'fromYNAB' in action ? action.fromYNAB : state.fromYNAB,
      };
    case constants.DEACTIVATE_TUTORIAL:
      return { ...state, stage: null };
    default:
  }

  return state;
}
