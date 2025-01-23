import { UserAvailable, UserEntity } from '../../../types/models/user';
import { NewUserAccessEntity } from '../../../types/models/userAccess';

export interface AdminHandlers {
  'users-get': () => Promise<UserEntity[] | null | { error: string }>;

  'user-delete-all': (
    ids: string[],
  ) => Promise<
    { someDeletionsFailed: boolean; ids?: number[] } | { error: string }
  >;

  'user-add': (
    user: Omit<UserEntity, 'id'>,
  ) => Promise<{ error: string } | { id: string }>;

  'user-update': (
    user: Omit<UserEntity, 'id'>,
  ) => Promise<{ error: string } | { id: string }>;

  'access-add': (
    user: NewUserAccessEntity,
  ) => Promise<{ error?: string } | Record<string, never>>;

  'access-delete-all': ({
    fileId,
    ids,
  }: {
    fileId: string;
    ids: string[];
  }) => Promise<{ someDeletionsFailed: boolean; ids?: number[] }>;

  'access-get-available-users': (
    fileId: string,
  ) => Promise<UserAvailable[] | { error: string }>;

  'transfer-ownership': ({
    fileId,
    newUserId,
  }: {
    fileId: string;
    newUserId: string;
  }) => Promise<{ error?: string } | Record<string, never>>;

  'owner-created': () => Promise<boolean>;
}
