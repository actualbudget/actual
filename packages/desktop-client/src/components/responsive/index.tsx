import { useResponsive } from '../../ResponsiveProvider';
import { LoadComponent } from '../util/LoadComponent';

import type * as NarrowComponents from './narrow';
import type * as SmallComponents from './small';
import type * as WideComponents from './wide';

let loadNarrow = () =>
  import(/* webpackChunkName: "narrow-components" */ './narrow');
let loadWide = () => import(/* webpackChunkName: "wide-components" */ './wide');
let loadSmall = () =>
  import(/* webpackChunkName: "small-components" */ './small');
export function WideComponent({ name }: { name: keyof typeof WideComponents }) {
  return <LoadComponent name={name} importer={loadWide} />;
}

export function NarrowAlternate({
  name,
}: {
  name: keyof typeof WideComponents &
    keyof typeof NarrowComponents &
    keyof typeof SmallComponents;
}) {
  const { isNarrowWidth } = useResponsive();
  const { isExtraSmallWidth } = useResponsive();
  return (
    <LoadComponent
      name={name}
      importer={
        isNarrowWidth ? loadNarrow : isExtraSmallWidth ? loadSmall : loadWide
      }
    />
  );
}
