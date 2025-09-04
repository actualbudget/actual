import { RenderPluginsComponent } from './RenderPluginsComponent';

type PluginCustomPageProps = {
  parameter: (container: HTMLDivElement) => void;
};

export function PluginCustomPage({ parameter }: PluginCustomPageProps) {
  return <RenderPluginsComponent toRender={new Map([['dummy', parameter]])} />;
}
