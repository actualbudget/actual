import { useResponsive } from '../../ResponsiveProvider';
import { LoadComponent } from '../util/LoadComponent';

import type * as NarrowComponents from './narrow';
import type * as WideComponents from './wide';

let loadNarrow = () =>
  import(/* webpackChunkName: "narrow-components" */ './narrow');
let loadWide = () => import(/* webpackChunkName: "wide-components" */ './wide');

export function WideComponent({ name }: { name: keyof typeof WideComponents }) {
  console.log(
    `<WideComponent name=${name} /> mounted at ${new Date().toISOString()}`,
  );
  return <LoadComponent name={name} importer={loadWide} />;
}

export function NarrowAlternate({
  name,
}: {
  name: keyof typeof WideComponents & keyof typeof NarrowComponents;
}) {
  console.log(
    `<NarrowAlternate name=${name} /> mounted at ${new Date().toISOString()}`,
  );
  const { isNarrowWidth } = useResponsive();
  return (
    <LoadComponent
      name={name}
      importer={isNarrowWidth ? loadNarrow : loadWide}
    />
  );
}
