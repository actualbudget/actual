export interface NewUserEntity {
  userName: string;
  displayName: string;
  role: string;
  enabled: boolean;
}

export interface UserEntity extends NewUserEntity {
  id: string;
  owner: boolean;
}

export interface UserEntityDropdown {
  userId: string;
  userName: string;
  displayName?: string;
}

export interface UserAvailable {
  userId: string;
  displayName?: string;
  userName: string;
  haveAccess?: number;
  owner?: number;
}
