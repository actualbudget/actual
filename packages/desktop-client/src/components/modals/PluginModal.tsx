import { Modal } from '../common/Modal';
import { RenderPluginsComponent } from '../plugins/RenderPluginsComponent';

type PluginModalProps = {
  parameter: (container: HTMLDivElement) => void;
};

export function PluginModal({ parameter }: PluginModalProps) {
  return (
    <Modal
      name="plugin-modal"
      containerProps={{
        style: { height: '90vh', width: '90vw' },
      }}
    >
      <RenderPluginsComponent toRender={new Map([['dummy', parameter]])} />
    </Modal>
  );
}
