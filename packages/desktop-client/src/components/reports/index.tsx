import { useState, useEffect } from 'react';

import AnimatedLoading from '../../icons/AnimatedLoading';
import { colors, styles } from '../../style';
import { Block, View } from '../common';

import type { ReportRouter } from './ReportRouter';

export default function Reports() {
  let [ReportRouterComponent, setReportRouter] = useState<
    typeof ReportRouter | null
  >(null);

  useEffect(() => {
    import(/* webpackChunkName: 'reports' */ './ReportRouter').then(module => {
      setReportRouter(() => module.ReportRouter);
    });
  }, []);

  return (
    <View style={{ flex: 1 }} data-testid="reports-page">
      {ReportRouterComponent ? (
        <ReportRouterComponent />
      ) : (
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
          <Block style={{ marginBottom: 20, fontSize: 18 }}>
            Loading reports…
          </Block>
          <AnimatedLoading width={25} color={colors.n1} />
        </View>
      )}
    </View>
  );
}
