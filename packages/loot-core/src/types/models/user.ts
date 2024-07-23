export interface NewUserEntity {
  userName: string;
  displayName: string;
  role: string;
  enabled: boolean;
}

export interface UserEntity extends NewUserEntity {
  id: string;
}

export interface UserEntityDropdown {
  userId: string;
  userName: string;
  displayName?: string;
}
