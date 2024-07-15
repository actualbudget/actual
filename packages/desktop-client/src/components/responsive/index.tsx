import { useResponsive } from '../../ResponsiveProvider';
import { LoadComponent } from '../util/LoadComponent';

import type * as NarrowComponents from './narrow';
import type * as WideComponents from './wide';
import type * as AdminWideComponents from '../admin/wide';

const loadNarrow = () =>
  import(/* webpackChunkName: "narrow-components" */ './narrow');
const loadWide = () =>
  import(/* webpackChunkName: "wide-components" */ './wide');
const loadWideAdmin = () =>
  import(/* webpackChunkName: "wide-components" */ '../admin/wide');

export function WideComponent({ name }: { name: keyof typeof WideComponents }) {
  return <LoadComponent name={name} importer={loadWide} />;
}

export function AdminWideComponent({
  name,
}: {
  name: keyof typeof AdminWideComponents;
}) {
  return <LoadComponent name={name} importer={loadWideAdmin} />;
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
