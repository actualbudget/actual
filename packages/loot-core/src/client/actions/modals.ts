import * as constants from '../constants';

export function pushModal(name, options) {
  return { type: constants.PUSH_MODAL, name, options };
}

export function replaceModal(name, options) {
  return { type: constants.REPLACE_MODAL, name, options };
}

export function hideModals() {
  return { type: constants.HIDE_MODALS };
}

export function showModals() {
  return { type: constants.SHOW_MODALS };
}

export function popModal() {
  return { type: constants.POP_MODAL };
}

export function closeModal() {
  return { type: constants.CLOSE_MODAL };
}
