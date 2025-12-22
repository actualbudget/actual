export type NewUserAccessEntity = {
  fileId: string;
  userId: string;
};

export type UserAccessEntity = {
  displayName: string;
  userName: string;
  fileName: string;
} & NewUserAccessEntity;
