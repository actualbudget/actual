import { type ComponentType, useEffect, useState } from 'react';

import promiseRetry from 'promise-retry';

import { LazyLoadFailedError } from 'loot-core/src/shared/errors';

import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { theme, styles } from '../../style';
import { Block } from '../common/Block';
import { View } from '../common/View';

type ProplessComponent = ComponentType<Record<string, never>>;
type LoadComponentProps<K extends string> = {
  name: K;
  message?: string;
  importer: () => Promise<{ [key in K]: ProplessComponent }>;
};
export function LoadComponent<K extends string>(props: LoadComponentProps<K>) {
  // need to set `key` so the component is reloaded when the name changes
  // otherwise the old component will be rendered while the new one is being loaded
  return <LoadComponentInner key={props.name} {...props} />;
}

// Cache of the various modules so we would not need to
// load the same thing multiple times.
const localModuleCache = new Map();

function LoadComponentInner<K extends string>({
  name,
  message,
  importer,
}: LoadComponentProps<K>) {
  const [Component, setComponent] = useState<ProplessComponent | null>(
    localModuleCache.get(name) ?? null,
  );
  const [failedToLoad, setFailedToLoad] = useState(false);

  useEffect(() => {
    if (localModuleCache.has(name)) {
      return;
    }

    setFailedToLoad(false);

    // Load the module; if it fails - retry with exponential backoff
    promiseRetry(
      retry =>
        importer()
          .then(module => {
            const component = () => module[name];
            localModuleCache.set(name, component);
            setComponent(component);
          })
          .catch(retry),
      {
        retries: 5,
      },
    ).catch(() => {
      setFailedToLoad(true);
    });
  }, [name, importer]);

  if (failedToLoad) {
    throw new LazyLoadFailedError(name);
  }

  if (!Component) {
    return (
      <View
        style={{
          flex: 1,
          gap: 20,
          justifyContent: 'center',
          alignItems: 'center',
          ...styles.delayedFadeIn,
        }}
      >
        {message && (
          <Block style={{ marginBottom: 20, fontSize: 18 }}>{message}</Block>
        )}
        <AnimatedLoading width={25} color={theme.pageTextDark} />
      </View>
    );
  }

  return <Component />;
}
