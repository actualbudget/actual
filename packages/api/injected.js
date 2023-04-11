// TODO: comment on why it works this way

export let send;

export function override(sendImplementation) {
  send = sendImplementation;
}
