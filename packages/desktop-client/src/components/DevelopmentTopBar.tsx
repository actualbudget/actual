import { theme } from '../style';

import ExternalLink from './common/ExternalLink';
import View from './common/View';

export default function DevelopmentTopBar() {
  return (
    <View
      style={{
        padding: '6px 20px',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        color: theme.warningText,
        backgroundColor: theme.warningBackground,
        borderBottom: `1px solid ${theme.warningAccent}`,
        zIndex: 1,
        flexShrink: 0,
      }}
    >
      <View>This is a demo build of Actual.</View>
      <View>
        <ExternalLink
          linkColor="blue"
          to={`https://github.com/actualbudget/actual/pull/${process.env.REACT_APP_REVIEW_ID}`}
        >
          Open the PR: #{process.env.REACT_APP_REVIEW_ID}
        </ExternalLink>
      </View>
    </View>
  );
}
