import Layout from '@theme-original/Layout';
import { useThemeSync } from '@site/src/hooks/useThemeSync';

export default function LayoutWrapper(props) {
  useThemeSync();

  return <Layout {...props} />;
}
