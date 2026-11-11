import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { css, keyframes } from '@emotion/css';

import { useReducedMotion } from '#hooks/useReducedMotion';

/** Where (within the stage) the zoom starts: the clicked node's rectangle. */
export type ZoomOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
};

export type ZoomTransition = {
  direction: 'in' | 'out';
  origin?: ZoomOrigin | null;
};

export const ZOOM_DURATION = 380;

const fillFromOrigin = keyframes({
  from: { opacity: 0.85 },
  '60%': { opacity: 0.35 },
  to: { left: 0, top: 0, width: '100%', height: '100%', opacity: 0 },
});

const leaveZoomIn = keyframes({
  from: { opacity: 1, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'scale(1.08)' },
});

const leaveZoomOut = keyframes({
  from: { opacity: 1, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'scale(0.92)' },
});

const enterZoomIn = keyframes({
  from: { opacity: 0, transform: 'scale(0.94)' },
  to: { opacity: 1, transform: 'scale(1)' },
});

const enterZoomOut = keyframes({
  from: { opacity: 0, transform: 'scale(1.06)' },
  to: { opacity: 1, transform: 'scale(1)' },
});

const layerClass = css({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
});

const overlayClass = css({
  position: 'absolute',
  borderRadius: 3,
  pointerEvents: 'none',
  animation: `${fillFromOrigin} ${ZOOM_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
});

type Layer = {
  key: string;
  state: 'current' | 'leaving';
  transition: ZoomTransition | null;
};

type SankeyZoomStageProps = {
  /** Identifies the level being shown; changing it triggers a transition. */
  levelKey: string;
  /** How the current level was reached (null for the initial render). */
  transition: ZoomTransition | null;
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * Hosts the chart of the current drill-down level and animates between
 * levels: zooming in grows the clicked node to fill the stage while the old
 * chart recedes and the new one settles in; zooming out plays the reverse.
 *
 * The outgoing level keeps rendering its last content while it fades, so no
 * chart ever re-measures or re-animates mid transition.
 */
export function SankeyZoomStage({
  levelKey,
  transition,
  children,
  style,
}: SankeyZoomStageProps) {
  const reducedMotion = useReducedMotion();
  const [layers, setLayers] = useState<Layer[]>([
    { key: levelKey, state: 'current', transition: null },
  ]);

  // The last content rendered for each level, so a leaving layer can keep
  // showing it. Written after commit, read while rendering the next level.
  const contentByKey = useRef(new Map<string, ReactNode>());
  useEffect(() => {
    contentByKey.current.set(levelKey, children);
  });

  const currentLayer = layers.find(layer => layer.state === 'current');
  if (currentLayer && currentLayer.key !== levelKey) {
    // Derive the new layer list synchronously so the outgoing layer never
    // renders the incoming level's content.
    setLayers(
      reducedMotion
        ? [{ key: levelKey, state: 'current', transition: null }]
        : [
            { ...currentLayer, state: 'leaving' },
            { key: levelKey, state: 'current', transition },
          ],
    );
  }

  const hasLeavingLayer = layers.some(layer => layer.state === 'leaving');
  useEffect(() => {
    if (!hasLeavingLayer) {
      return;
    }
    const timer = setTimeout(() => {
      setLayers(previous =>
        previous
          .filter(layer => layer.state === 'current')
          .map(layer => ({ ...layer, transition: null })),
      );
    }, ZOOM_DURATION + 60);
    return () => clearTimeout(timer);
  }, [hasLeavingLayer, levelKey]);

  const activeTransition = layers.find(
    layer => layer.state === 'current',
  )?.transition;
  const origin = activeTransition?.origin;
  const originCenter = origin
    ? `${origin.x + origin.width / 2}px ${origin.y + origin.height / 2}px`
    : 'center';

  return (
    <div
      data-testid="sankey-zoom-stage"
      style={{ position: 'relative', flex: 1, minHeight: 0, ...style }}
    >
      {layers.map(layer => {
        const isCurrent = layer.state === 'current';
        const content = isCurrent
          ? children
          : contentByKey.current.get(layer.key);
        const direction = isCurrent
          ? layer.transition?.direction
          : activeTransition?.direction;

        let animation: string | undefined;
        if (!reducedMotion && direction) {
          const frames = isCurrent
            ? direction === 'in'
              ? enterZoomIn
              : enterZoomOut
            : direction === 'in'
              ? leaveZoomIn
              : leaveZoomOut;
          animation = `${frames} ${ZOOM_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1) both`;
        }

        return (
          <div
            key={layer.key}
            className={layerClass}
            data-zoom-layer={layer.state}
            style={{
              animation,
              transformOrigin: direction === 'in' ? originCenter : 'center',
              pointerEvents: isCurrent ? 'auto' : 'none',
              zIndex: isCurrent ? 1 : 0,
            }}
          >
            {content}
          </div>
        );
      })}

      {!reducedMotion && hasLeavingLayer && origin && (
        <div
          key={levelKey}
          aria-hidden
          className={overlayClass}
          style={{
            left: origin.x,
            top: origin.y,
            width: origin.width,
            height: origin.height,
            backgroundColor: origin.color,
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}
