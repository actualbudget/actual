import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { LoadComponent } from '../util/LoadComponent';

import type * as NarrowComponents from './narrow';
import type * as WideComponents from './wide';

const loadNarrow = () =>
  import(/* webpackChunkName: "narrow-components" */ './narrow');
const loadWide = () =>
  import(/* webpackChunkName: "wide-components" */ './wide');

export function WideComponent({ name }: { name: keyof typeof WideComponents }) {
  return <LoadComponent name={name} importer={loadWide} />;
}

export function NarrowAlternate({
  name,
}: {
  name: keyof typeof WideComponents & keyof typeof NarrowComponents;
}) {
  const { isNarrowWidth } = useResponsive();
  return (
    <LoadComponent
      name={name}
      importer={isNarrowWidth ? loadNarrow : loadWide}
    />
  );
}
