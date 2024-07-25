import { UserEntity, UserEntityDropdown } from '../../../types/models/user';
import {
  NewUserAccessEntity,
  UserAccessEntity,
} from '../../../types/models/userAccess';

export interface AdminHandlers {
  'users-get': () => Promise<UserEntity[] | null>;

  'users-get-access': (
    fileIds: string[],
  ) => Promise<Map<string, UserAccessEntity[]> | null>;

  'user-delete-all': (
    ids: string[],
  ) => Promise<{ someDeletionsFailed: boolean; ids?: number[] }>;

  'user-add': (
    user: Omit<UserEntity, 'id'>,
  ) => Promise<{ error?: string } | { id: string }>;

  'user-update': (
    user: Omit<UserEntity, 'id'>,
  ) => Promise<{ error?: string } | { id: string }>;

  'check-file-access': (fileId: string) => Promise<{ granted: boolean }>;

  'access-add': (
    user: NewUserAccessEntity,
  ) => Promise<{ error?: string } | Record<string, never>>;

  'access-get': (fileId: string) => Promise<UserAccessEntity[]>;

  'access-get-available-users': (
    fileId: string,
  ) => Promise<UserEntityDropdown[]>;

  'transfer-ownership': ({
    fileId,
    newUserId,
  }: {
    fileId: string;
    newUserId: string;
  }) => Promise<{ error?: string } | Record<string, never>>;

  'file-owner-get': (fileId: string) => Promise<UserEntity | null>;

  'auth-mode': () => Promise<string>;

  'multiuser-get': () => Promise<boolean | null>;
}
