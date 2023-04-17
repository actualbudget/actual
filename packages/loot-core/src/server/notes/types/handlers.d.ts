export interface NoteHandlers {
  'notes-save': (arg: { id; note }) => Promise<unknown>;
}
