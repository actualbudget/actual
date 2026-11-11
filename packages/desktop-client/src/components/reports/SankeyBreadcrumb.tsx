import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowLeft } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

type SankeyBreadcrumbProps = {
  /** Names of the levels that were drilled into, outermost first. */
  segments: string[];
  /** Label of the root level ("Main"). */
  rootLabel: string;
  /** Navigate to a level: 0 is the root, `segments.length` the current one. */
  onNavigate: (depth: number) => void;
};

/**
 * A file-path style trail ("Main › Bills › Internet") showing where the user
 * has zoomed into the Sankey diagram. Every ancestor is a link back up; the
 * arrow steps back one level.
 */
export function SankeyBreadcrumb({
  segments,
  rootLabel,
  onNavigate,
}: SankeyBreadcrumbProps) {
  const { t } = useTranslation();

  if (segments.length === 0) {
    return null;
  }

  const trail = [rootLabel, ...segments];

  return (
    <nav
      aria-label={t('Sankey drill-down path')}
      data-testid="sankey-breadcrumb"
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        minHeight: 26,
        paddingLeft: 4,
        paddingRight: 4,
        color: theme.pageTextSubdued,
        ...styles.smallText,
      })}
    >
      <Button
        variant="bare"
        aria-label={t('Back to {{name}}', { name: trail[trail.length - 2] })}
        data-testid="sankey-breadcrumb-back"
        onPress={() => onNavigate(segments.length - 1)}
        style={{ padding: '3px 5px', marginRight: 2, color: 'inherit' }}
      >
        <SvgArrowLeft width={11} height={11} />
      </Button>
      {trail.map((name, depth) => {
        const isCurrent = depth === trail.length - 1;
        return (
          <Fragment key={`${depth}-${name}`}>
            {depth > 0 && (
              <Text aria-hidden style={{ opacity: 0.6, padding: '0 2px' }}>
                ›
              </Text>
            )}
            {isCurrent ? (
              <Text
                aria-current="location"
                style={{
                  color: theme.pageText,
                  fontWeight: 600,
                  padding: '3px 4px',
                  ...styles.ellipsisText,
                  maxWidth: 260,
                }}
              >
                {name}
              </Text>
            ) : (
              <Button
                variant="bare"
                onPress={() => onNavigate(depth)}
                style={{
                  padding: '3px 4px',
                  color: 'inherit',
                  fontSize: 'inherit',
                  maxWidth: 200,
                }}
              >
                <Text style={{ ...styles.ellipsisText }}>{name}</Text>
              </Button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
