import { colorsm } from '../style';

import { ExternalLink } from './common';
import View from './common/View';

export default function DevelopmentTopBar() {
  return (
    <View
      style={[
        {
          padding: '6px 20px',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          color: colorsm.warningText,
          backgroundColor: colorsm.warningBackground,
          borderBottom: `1px solid ${colorsm.warningAccent}`,
          zIndex: 1,
        },
      ]}
    >
      <View>This is a demo build of Actual.</View>
      <View>
        <ExternalLink
          to={`https://github.com/actualbudget/actual/pull/${process.env.REACT_APP_REVIEW_ID}`}
        >
          Open the PR: #{process.env.REACT_APP_REVIEW_ID}
        </ExternalLink>
      </View>
    </View>
  );
}
