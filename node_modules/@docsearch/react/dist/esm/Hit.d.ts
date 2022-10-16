import React from 'react';
import type { InternalDocSearchHit, StoredDocSearchHit } from './types';
interface HitProps {
    hit: InternalDocSearchHit | StoredDocSearchHit;
    children: React.ReactNode;
}
export declare function Hit({ hit, children }: HitProps): JSX.Element;
export {};
