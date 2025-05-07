import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import type * as NarrowComponents from '@desktop-client/components/responsive/narrow';
import type * as WideComponents from '@desktop-client/components/responsive/wide';
import { LoadComponent } from '@desktop-client/components/util/LoadComponent';

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
