import { useMemo } from 'react';

import { type BasicModalProps } from '@actual-app/components/props/modalProps';

import { Modal } from '#components/common/Modal';
import { RenderPluginsComponent } from '#components/plugins/RenderPluginsComponent';

type PluginModalProps = {
  parameter: (container: HTMLDivElement) => void | (() => void);
  modalProps?: BasicModalProps;
};

export function PluginModal({ parameter, modalProps }: PluginModalProps) {
  const toRender = useMemo(() => new Map([['dummy', parameter]]), [parameter]);

  return (
    <Modal
      name="plugin-modal"
      isLoading={modalProps?.isLoading}
      noAnimation={modalProps?.noAnimation}
      style={modalProps?.style}
      onClose={modalProps?.onClose}
      containerProps={modalProps?.containerProps}
    >
      <RenderPluginsComponent toRender={toRender} />
    </Modal>
  );
}
