export interface NewUserEntity {
  userName: string;
  displayName: string;
  role: string;
  enabled: boolean;
}

export interface UserEntity extends NewUserEntity {
  id: string;
  master: boolean;
}

export interface UserEntityDropdown {
  userId: string;
  userName: string;
  displayName?: string;
}

export const PossibleRoles = {
  '213733c1-5645-46ad-8784-a7b20b400f93': 'Admin',
  'e87fa1f1-ac8c-4913-b1b5-1096bdb1eacc': 'Basic',
};
