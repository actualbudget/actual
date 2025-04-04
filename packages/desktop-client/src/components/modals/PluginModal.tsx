import { type BasicModalProps } from '@actual-app/components/props/modalProps';

import { Modal } from '@desktop-client/components/common/Modal';
import { RenderPluginsComponent } from '@desktop-client/components/plugins/RenderPluginsComponent';

type PluginModalProps = {
  parameter: (container: HTMLDivElement) => void;
  modalProps: BasicModalProps;
};

export function PluginModal({ parameter, modalProps }: PluginModalProps) {
  return (
    <Modal
      name="plugin-modal"
      isLoading={modalProps?.isLoading}
      noAnimation={modalProps?.noAnimation}
      style={modalProps?.style}
      onClose={modalProps?.onClose}
      containerProps={modalProps?.containerProps}
    >
      <RenderPluginsComponent toRender={new Map([['dummy', parameter]])} />
    </Modal>
  );
}
