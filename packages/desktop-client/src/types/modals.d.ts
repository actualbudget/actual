import { type PopModalAction } from 'loot-core/src/client/state-types/modals';

export type CommonModalProps = {
  onClose: () => PopModalAction;
  onBack: () => PopModalAction;
  showBack: boolean;
  isCurrent: boolean;
  isHidden: boolean;
  stackIndex: number;
};
