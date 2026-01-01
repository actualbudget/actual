export type TagType = 'TAG' | 'PERSON';

export type TagEntity = {
  id: string;
  tag: string;
  type?: TagType;
  color?: string | null;
  description?: string | null;
};
