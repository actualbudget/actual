import { useEffect, useState, type ComponentType } from 'react';

import { Block } from '@actual-app/components/block';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import promiseRetry from 'promise-retry';

import { LazyLoadFailedError } from 'loot-core/shared/errors';

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

function LoadComponentInner<K extends string>({
  name,
  message,
  importer,
}: LoadComponentProps<K>) {
  const [Component, setComponent] = useState<ProplessComponent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isUnmounted = false;
    setError(null);
    setComponent(null);

    // Load the module; if it fails - retry with exponential backoff
    promiseRetry(
      retry =>
        importer()
          .then(module => {
            // Handle possibly being unmounted while retrying.
            if (!isUnmounted) {
              setComponent(() => module[name]);
            }
          })
          .catch(retry),
      {
        retries: 5,
      },
    ).catch(e => {
      if (!isUnmounted) {
        setError(e);
      }
    });

    return () => {
      isUnmounted = true;
    };
  }, [name, importer]);

  if (error) {
    throw new LazyLoadFailedError(name, error);
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
