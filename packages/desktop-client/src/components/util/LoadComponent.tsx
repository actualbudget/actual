import { type ComponentType, useEffect, useState } from 'react';

import AnimatedLoading from '../../icons/AnimatedLoading';
import { colors, styles } from '../../style';
import { Block, View } from '../common';

type ProplessComponent = ComponentType<Record<string, never>>;
export function LoadComponent<K extends string>({
  name,
  message,
  importer,
}: {
  name: K;
  message?: string;
  importer: () => Promise<{ [key in K]: ProplessComponent }>;
}) {
  let [Component, setComponent] = useState<ProplessComponent | null>(null);
  useEffect(() => {
    importer().then(module => setComponent(() => module[name]));
  }, [name, importer]);

  if (!Component) {
    return (
      <View
        style={[
          {
            flex: 1,
            gap: 20,
            justifyContent: 'center',
            alignItems: 'center',
          },
          styles.delayedFadeIn,
        ]}
      >
        {message && (
          <Block style={{ marginBottom: 20, fontSize: 18 }}>{message}</Block>
        )}
        <AnimatedLoading width={25} color={colors.n1} />
      </View>
    );
  }
  return <Component />;
}
