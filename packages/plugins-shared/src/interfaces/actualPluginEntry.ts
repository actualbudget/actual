import React from 'react';

import { ActualPlugin } from './actualPlugin';

export type ActualPluginEntry = (react: typeof React) => ActualPlugin;
