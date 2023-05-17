export interface NotesHandlers {
  'notes-save': (arg: { id; note }) => Promise<unknown>;
}
