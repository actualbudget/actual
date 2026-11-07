import React from 'react';

import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';

const host =
  typeof window !== 'undefined'
    ? window.location.hostname.replace(/^www\./, '')
    : '';

export default function DocVersionBanner() {
  const isBrowser = useIsBrowser();
  const {
    siteConfig: {
      customFields: {
        mainHost,
        currentDocsUrl,
        docVersion,
        isNext: configIsNext,
      },
    },
  } = useDocusaurusContext();

  const isNext =
    configIsNext || host.startsWith('next.') || host.startsWith('next--');

  // Local builds have no version-specific host, so only flag them as Next
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  if (
    !isBrowser ||
    (!isNext &&
      (isLocal ||
        host === mainHost ||
        host === 'actualbudget-website.netlify.app'))
  )
    return null;

  return (
    <div
      className={`theme-doc-version-banner alert alert--${isNext ? 'info' : 'warning'} margin-bottom--md`}
      role="alert"
    >
      <div>
        {isNext
          ? 'This is unreleased documentation for Actual Budget (Next).'
          : `This is documentation for v${docVersion} of Actual Budget.`}{' '}
        For the current release, see the{' '}
        <Link to={currentDocsUrl}>latest version</Link>.
      </div>
    </div>
  );
}
