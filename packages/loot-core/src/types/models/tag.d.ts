export interface NewTagEntity {
  id?: string;
  tag: string;
  color: string;
  textColor: string;
  hoverColor: string;
}

export interface TagEntity extends NewTagEntity {
  id: string;
}
