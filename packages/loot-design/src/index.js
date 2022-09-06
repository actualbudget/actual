import { plugins } from 'glamor';

import renderDocument from './guide/document';

plugins.clear();

renderDocument(document.getElementById('root'));
