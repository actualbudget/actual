import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/inter';

import { setI18NextLanguage } from '#i18n';

import { OAuthConsentApp } from './OAuthConsentApp';
import './oauth-consent.css';

setI18NextLanguage(null);

const root = document.getElementById('oauth-consent-root');

if (!root) throw new Error('OAuth consent root element is missing');

createRoot(root).render(
  <StrictMode>
    <OAuthConsentApp />
  </StrictMode>,
);
