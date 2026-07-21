import type { ReactNode } from 'react';

import Admonition from '@theme/Admonition';

type ExperimentalFeatureWarningProps = {
  issueId?: string;
  children?: ReactNode;
};

export function ExperimentalFeatureWarning({
  issueId,
  children,
}: ExperimentalFeatureWarningProps) {
  return (
    <Admonition type="warning">
      <p>
        This is an <strong>experimental feature</strong>. That means we're still
        working on finishing it. There may be bugs, missing functionality or
        incomplete documentation, and we may decide to remove the feature in a
        future release. If you have any feedback, please{' '}
        {issueId ? (
          <>
            comment on the{' '}
            <a
              href={`https://github.com/actualbudget/actual/issues/${issueId}`}
              rel="noopener noreferrer"
            >
              dedicated feedback issue
            </a>
          </>
        ) : (
          <a
            href="https://github.com/actualbudget/actual/issues"
            rel="noopener noreferrer"
          >
            open an issue
          </a>
        )}{' '}
        or post a message in the Discord.
      </p>
      <p>
        Due to being an experimental feature, it is not made available by default.
        To enable it, you will need to go into <strong>More</strong> and <strong>Settings</strong>,
        scroll at the bottom and <strong>open the advanced settings</strong>, scroll once again and
        <strong>accept the risks to show experimental features</strong>.
        Then you can tick the <em>checkbox<em> related to this feature.
      </p>
      {children}
    </Admonition>
  );
}
