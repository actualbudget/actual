export interface NewUserAccessEntity {
  fileId: string;
  userId: string;
}

export interface UserAccessEntity extends NewUserAccessEntity {
  displayName: string;
  userName: string;
  fileName: string;
}
